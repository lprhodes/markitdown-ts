// src/converters/pdf.ts
import type {
  DocumentConverter,
  StreamInfo,
  ConverterInput,
  InternalConvertOptions,
  ConvertResult,
} from '../types.js';
import { MissingDependencyError } from '../errors.js';

const ACCEPTED_MIME_PREFIXES = ['application/pdf', 'application/x-pdf'];
const ACCEPTED_EXTENSIONS = ['.pdf'];

/** Pattern for MasterFormat-style partial numbering (e.g., ".1", ".2", ".10") */
const PARTIAL_NUMBERING_PATTERN = /^\.\d+$/;

/**
 * Word item extracted from a PDF page with spatial coordinates.
 * Coordinates use a top-origin system (top = distance from top of page).
 */
interface WordItem {
  text: string;
  x0: number;
  y0: number; // top
  x1: number;
  y1: number; // bottom
}

/**
 * Analyzed row of text content from a PDF page.
 */
interface RowInfo {
  yKey: number;
  words: WordItem[];
  text: string;
  xGroups: number[];
  isParagraph: boolean;
  numColumns: number;
  hasPartialNumbering: boolean;
  isTableRow: boolean;
}

/**
 * Post-process extracted text to merge MasterFormat-style partial numbering
 * with the following text line.
 *
 * MasterFormat documents use partial numbering like:
 *     .1  The intent of this Request for Proposal...
 *     .2  Available information relative to...
 *
 * Some PDF extractors split these into separate lines:
 *     .1
 *     The intent of this Request for Proposal...
 *
 * This function merges them back together.
 */
function mergePartialNumberingLines(text: string): string {
  const lines = text.split('\n');
  const resultLines: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const stripped = line.trim();

    // Check if this line is ONLY a partial numbering
    if (PARTIAL_NUMBERING_PATTERN.test(stripped)) {
      // Look for the next non-empty line to merge with
      let j = i + 1;
      while (j < lines.length && !lines[j].trim()) {
        j++;
      }

      if (j < lines.length) {
        // Merge the partial numbering with the next line
        const nextLine = lines[j].trim();
        resultLines.push(`${stripped} ${nextLine}`);
        i = j + 1; // Skip past the merged line
      } else {
        // No next line to merge with, keep as is
        resultLines.push(line);
        i++;
      }
    } else {
      resultLines.push(line);
      i++;
    }
  }

  return resultLines.join('\n');
}

/**
 * Extract form-style content from a PDF page by analyzing word positions.
 * This handles borderless forms/tables where words are aligned in columns.
 *
 * Returns markdown with proper table formatting:
 * - Tables have pipe-separated columns with header separator rows
 * - Non-table content is rendered as plain text
 *
 * Returns null if the page doesn't appear to be a form-style document.
 */
function extractFormContentFromWords(
  words: WordItem[],
  pageWidth: number,
): string | null {
  if (words.length === 0) {
    return null;
  }

  // Group words by their Y position (rows)
  const yTolerance = 5;
  const rowsByY = new Map<number, WordItem[]>();
  for (const word of words) {
    const yKey = Math.round(word.y0 / yTolerance) * yTolerance;
    let row = rowsByY.get(yKey);
    if (!row) {
      row = [];
      rowsByY.set(yKey, row);
    }
    row.push(word);
  }

  // Sort rows by Y position (top to bottom)
  const sortedYKeys = [...rowsByY.keys()].sort((a, b) => a - b);

  // First pass: analyze each row
  const rowInfo: RowInfo[] = [];
  for (const yKey of sortedYKeys) {
    const rowWords = [...rowsByY.get(yKey)!].sort((a, b) => a.x0 - b.x0);
    if (rowWords.length === 0) continue;

    const firstX0 = rowWords[0].x0;
    const lastX1 = rowWords[rowWords.length - 1].x1;
    const lineWidth = lastX1 - firstX0;
    const combinedText = rowWords.map((w) => w.text).join(' ');

    // Count distinct x-position groups (columns)
    const xPositions = rowWords.map((w) => w.x0);
    const xGroups: number[] = [];
    for (const x of [...xPositions].sort((a, b) => a - b)) {
      if (xGroups.length === 0 || x - xGroups[xGroups.length - 1] > 50) {
        xGroups.push(x);
      }
    }

    // Determine row type
    const isParagraph = lineWidth > pageWidth * 0.55 && combinedText.length > 60;

    // Check for MasterFormat-style partial numbering (e.g., ".1", ".2")
    let hasPartialNumbering = false;
    if (rowWords.length > 0) {
      const firstWord = rowWords[0].text.trim();
      if (PARTIAL_NUMBERING_PATTERN.test(firstWord)) {
        hasPartialNumbering = true;
      }
    }

    rowInfo.push({
      yKey,
      words: rowWords,
      text: combinedText,
      xGroups,
      isParagraph,
      numColumns: xGroups.length,
      hasPartialNumbering,
      isTableRow: false, // Will be set below
    });
  }

  // Collect ALL x-positions from rows with 3+ columns (table-like rows)
  const allTableXPositions: number[] = [];
  for (const info of rowInfo) {
    if (info.numColumns >= 3 && !info.isParagraph) {
      allTableXPositions.push(...info.xGroups);
    }
  }

  if (allTableXPositions.length === 0) {
    return null;
  }

  // Compute adaptive column clustering tolerance based on gap analysis
  allTableXPositions.sort((a, b) => a - b);

  // Calculate gaps between consecutive x-positions
  const gaps: number[] = [];
  for (let i = 0; i < allTableXPositions.length - 1; i++) {
    const gap = allTableXPositions[i + 1] - allTableXPositions[i];
    if (gap > 5) {
      // Only significant gaps
      gaps.push(gap);
    }
  }

  // Determine optimal tolerance using statistical analysis
  let adaptiveTolerance: number;
  if (gaps.length >= 3) {
    // Use 70th percentile of gaps as threshold (balances precision/recall)
    const sortedGaps = [...gaps].sort((a, b) => a - b);
    const percentile70Idx = Math.floor(sortedGaps.length * 0.7);
    adaptiveTolerance = sortedGaps[percentile70Idx];

    // Clamp tolerance to reasonable range [25, 50]
    adaptiveTolerance = Math.max(25, Math.min(50, adaptiveTolerance));
  } else {
    // Fallback to conservative value
    adaptiveTolerance = 35;
  }

  // Compute global column boundaries using adaptive tolerance
  const globalColumns: number[] = [];
  for (const x of allTableXPositions) {
    if (globalColumns.length === 0 || x - globalColumns[globalColumns.length - 1] > adaptiveTolerance) {
      globalColumns.push(x);
    }
  }

  // Adaptive max column check based on page characteristics
  if (globalColumns.length > 1) {
    const contentWidth = globalColumns[globalColumns.length - 1] - globalColumns[0];
    const avgColWidth = contentWidth / globalColumns.length;

    // Forms with very narrow columns (< 30px) are likely dense text
    if (avgColWidth < 30) {
      return null;
    }

    // Compute adaptive max based on columns per inch
    const columnsPerInch = globalColumns.length / (contentWidth / 72);

    // If density is too high (> 10 cols/inch), likely not a form
    if (columnsPerInch > 10) {
      return null;
    }

    // Adaptive max: allow more columns for wider pages
    const adaptiveMaxColumns = Math.max(15, Math.floor(20 * (pageWidth / 612)));

    if (globalColumns.length > adaptiveMaxColumns) {
      return null;
    }
  } else {
    // Single column, not a form
    return null;
  }

  // Now classify each row as table row or not
  const numCols = globalColumns.length;
  for (const info of rowInfo) {
    if (info.isParagraph) {
      info.isTableRow = false;
      continue;
    }

    // Rows with partial numbering are list items, not table rows
    if (info.hasPartialNumbering) {
      info.isTableRow = false;
      continue;
    }

    // Count how many global columns this row's words align with
    const alignedColumns = new Set<number>();
    for (const word of info.words) {
      const wordX = word.x0;
      for (let colIdx = 0; colIdx < globalColumns.length; colIdx++) {
        if (Math.abs(wordX - globalColumns[colIdx]) < 40) {
          alignedColumns.add(colIdx);
          break;
        }
      }
    }

    // If row uses 2+ of the established columns, it's a table row
    info.isTableRow = alignedColumns.size >= 2;
  }

  // Find table regions (consecutive table rows)
  const tableRegions: Array<[number, number]> = [];
  let i = 0;
  while (i < rowInfo.length) {
    if (rowInfo[i].isTableRow) {
      const startIdx = i;
      while (i < rowInfo.length && rowInfo[i].isTableRow) {
        i++;
      }
      tableRegions.push([startIdx, i]);
    } else {
      i++;
    }
  }

  // Check if enough rows are table rows (at least 20%)
  const totalTableRows = tableRegions.reduce((sum, [start, end]) => sum + (end - start), 0);
  if (rowInfo.length > 0 && totalTableRows / rowInfo.length < 0.2) {
    return null;
  }

  // Helper function to extract cells from a row
  function extractCells(info: RowInfo): string[] {
    const cells: string[] = new Array(numCols).fill('');
    for (const word of info.words) {
      const wordX = word.x0;
      // Find the correct column using boundary ranges
      let assignedCol = numCols - 1; // Default to last column
      for (let colIdx = 0; colIdx < numCols - 1; colIdx++) {
        const colEnd = globalColumns[colIdx + 1];
        if (wordX < colEnd - 20) {
          assignedCol = colIdx;
          break;
        }
      }
      if (cells[assignedCol]) {
        cells[assignedCol] += ' ' + word.text;
      } else {
        cells[assignedCol] = word.text;
      }
    }
    return cells;
  }

  // Build output - collect table data first, then format with proper column widths
  const resultLines: string[] = [];

  let idx = 0;
  while (idx < rowInfo.length) {
    const info = rowInfo[idx];

    // Check if this row starts a table region
    let tableRegion: [number, number] | null = null;
    for (const [start, end] of tableRegions) {
      if (idx === start) {
        tableRegion = [start, end];
        break;
      }
    }

    if (tableRegion) {
      const [start, end] = tableRegion;
      // Collect all rows in this table
      const tableData: string[][] = [];
      for (let tableIdx = start; tableIdx < end; tableIdx++) {
        const cells = extractCells(rowInfo[tableIdx]);
        tableData.push(cells);
      }

      // Calculate column widths for this table
      if (tableData.length > 0) {
        const colWidths: number[] = [];
        for (let col = 0; col < numCols; col++) {
          let maxLen = 3; // Minimum width for separator dashes
          for (const row of tableData) {
            maxLen = Math.max(maxLen, row[col].length);
          }
          colWidths.push(maxLen);
        }

        // Format header row
        const header = tableData[0];
        const headerStr =
          '| ' +
          header.map((cell, i) => cell.padEnd(colWidths[i])).join(' | ') +
          ' |';
        resultLines.push(headerStr);

        // Format separator row
        const separator =
          '| ' +
          colWidths.map((w) => '-'.repeat(w)).join(' | ') +
          ' |';
        resultLines.push(separator);

        // Format data rows
        for (let r = 1; r < tableData.length; r++) {
          const row = tableData[r];
          const rowStr =
            '| ' +
            row.map((cell, i) => cell.padEnd(colWidths[i])).join(' | ') +
            ' |';
          resultLines.push(rowStr);
        }
      }

      idx = end; // Skip to end of table region
    } else {
      // Check if we're inside a table region (not at start)
      let inTable = false;
      for (const [start, end] of tableRegions) {
        if (start < idx && idx < end) {
          inTable = true;
          break;
        }
      }

      if (!inTable) {
        // Non-table content
        resultLines.push(info.text);
      }
      idx++;
    }
  }

  return resultLines.join('\n');
}

/**
 * Extract words from pdfjs text content items, converting to top-origin coordinates.
 */
function extractWords(
  items: Array<{ str: string; transform: number[]; width: number; height: number; hasEOL?: boolean }>,
  pageHeight: number,
): WordItem[] {
  const words: WordItem[] = [];

  for (const item of items) {
    const text = item.str.trim();
    if (!text) continue;

    const x = item.transform[4];
    const y = item.transform[5];
    const w = item.width;
    const h = item.height;

    // Convert from PDF coordinates (y increases upward) to top-origin (y increases downward)
    const top = pageHeight - y;
    const bottom = top + Math.abs(h);

    // Split text into words to mimic pdfplumber's extract_words behavior
    // pdfplumber groups characters into words based on proximity;
    // pdfjs gives us text chunks that can contain spaces.
    // We split by whitespace but preserve spatial positioning.
    const subWords = text.split(/\s+/);
    if (subWords.length === 1) {
      words.push({
        text,
        x0: x,
        y0: top,
        x1: x + w,
        y1: bottom,
      });
    } else {
      // Distribute sub-words proportionally across the width
      const totalLen = subWords.reduce((sum, sw) => sum + sw.length, 0);
      let currentX = x;
      for (const sw of subWords) {
        const swWidth = (sw.length / totalLen) * w;
        words.push({
          text: sw,
          x0: currentX,
          y0: top,
          x1: currentX + swWidth,
          y1: bottom,
        });
        currentX += swWidth + (w / totalLen) * 0.5; // small gap between words
      }
    }
  }

  return words;
}

/**
 * Simple text extraction: join text items in reading order.
 */
function extractSimpleText(
  items: Array<{ str: string; hasEOL?: boolean; transform: number[]; height: number }>,
  pageHeight: number,
): string {
  // Group items by Y position to detect lines
  const yTolerance = 3;
  const linesByY = new Map<number, Array<{ str: string; x: number }>>();

  for (const item of items) {
    const y = item.transform[5];
    const top = pageHeight - y;
    const yKey = Math.round(top / yTolerance) * yTolerance;

    let line = linesByY.get(yKey);
    if (!line) {
      line = [];
      linesByY.set(yKey, line);
    }
    line.push({ str: item.str, x: item.transform[4] });
  }

  // Sort lines top-to-bottom, items left-to-right
  const sortedYKeys = [...linesByY.keys()].sort((a, b) => a - b);
  const lines: string[] = [];

  for (const yKey of sortedYKeys) {
    const lineItems = linesByY.get(yKey)!.sort((a, b) => a.x - b.x);
    const lineText = lineItems.map((li) => li.str).join('');
    if (lineText.trim()) {
      lines.push(lineText.trim());
    }
  }

  return lines.join('\n');
}

/** Annotation type constants from PDF spec */
const COMMENT_ANNOTATION_TYPES = new Set([1, 3, 9, 10, 11, 12]); // TEXT, FREETEXT, HIGHLIGHT, UNDERLINE, SQUIGGLY, STRIKEOUT

/**
 * Extract comment-type annotations from a PDF page and format as markdown.
 */
async function extractAnnotationComments(page: any): Promise<string | null> {
  const annotations = await page.getAnnotations({ intent: 'any' });
  const pageComments: { author: string; text: string; type: string }[] = [];

  for (const annot of annotations) {
    if (!COMMENT_ANNOTATION_TYPES.has(annot.annotationType)) continue;
    const text = annot.contentsObj?.str ?? '';
    if (!text.trim()) continue;
    const author = annot.titleObj?.str ?? '';
    const subtype = annot.subtype ?? 'Note';
    pageComments.push({ author, text: text.trim(), type: subtype });
  }

  if (pageComments.length === 0) return null;

  let commentSection = '\n\n### Comments\n';
  for (const c of pageComments) {
    if (c.author) {
      commentSection += `- **${c.author}** (${c.type}): ${c.text}\n`;
    } else {
      commentSection += `- (${c.type}): ${c.text}\n`;
    }
  }
  return commentSection.trimEnd();
}

export class PdfConverter implements DocumentConverter {
  accepts(info: StreamInfo): boolean {
    const ext = info.extension?.toLowerCase();
    if (ext && ACCEPTED_EXTENSIONS.includes(ext)) return true;

    const mime = info.mimetype?.toLowerCase() ?? '';
    for (const prefix of ACCEPTED_MIME_PREFIXES) {
      if (mime.startsWith(prefix)) return true;
    }

    return false;
  }

  async convert(
    input: ConverterInput,
    _info: StreamInfo,
    _opts: InternalConvertOptions,
  ): Promise<ConvertResult | null> {
    let pdfjsLib: typeof import('pdfjs-dist/legacy/build/pdf.mjs');
    try {
      pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
    } catch {
      throw new MissingDependencyError('pdfjs-dist', 'pnpm add pdfjs-dist');
    }

    // Configure worker for Node.js / Edge / serverless environments
    // In pdfjs-dist v5+, Node.js auto-disables the worker but still needs workerSrc set.
    // We set it to a path that resolves to the actual worker file.
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      try {
        // Resolve the worker path relative to the pdfjs-dist package
        const { fileURLToPath } = await import('url');
        const { dirname, join } = await import('path');
        const pdfjsPath = dirname(
          fileURLToPath(import.meta.resolve('pdfjs-dist/legacy/build/pdf.mjs')),
        );
        pdfjsLib.GlobalWorkerOptions.workerSrc = join(pdfjsPath, 'pdf.worker.mjs');
      } catch {
        // If resolution fails, set a dummy path. The fake worker setup
        // in Node.js will still work as long as it can import.
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'pdf.worker.mjs';
      }
    }

    const buffer = await input.buffer();

    // Resolve the standard fonts directory for proper rendering
    let standardFontDataUrl: string | undefined;
    try {
      const { fileURLToPath } = await import('url');
      const { dirname, join } = await import('path');
      const pdfjsPath = dirname(
        fileURLToPath(import.meta.resolve('pdfjs-dist/legacy/build/pdf.mjs')),
      );
      const fontsDir = join(pdfjsPath, '..', '..', 'standard_fonts/');
      standardFontDataUrl = fontsDir;
    } catch {
      // Fall through — some PDFs will show warnings but still work
    }

    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(buffer),
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: false,
      disableFontFace: true,
      ...(standardFontDataUrl ? { standardFontDataUrl } : {}),
    });

    const doc = await loadingTask.promise;

    try {
      const markdownChunks: string[] = [];
      let formPageCount = 0;

      for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
        const page = await doc.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.0 });
        const pageHeight = viewport.height;
        const pageWidth = viewport.width;

        try {
          const textContent = await page.getTextContent();

          // Filter to TextItem only (exclude TextMarkedContent)
          const textItems = textContent.items.filter(
            (item): item is { str: string; dir: string; transform: number[]; width: number; height: number; fontName: string; hasEOL: boolean } =>
              'str' in item,
          );

          if (textItems.length > 0) {
            // Try spatial analysis first (form/table detection)
            const words = extractWords(textItems, pageHeight);
            const formContent = extractFormContentFromWords(words, pageWidth);

            if (formContent !== null) {
              formPageCount++;
              if (formContent.trim()) {
                markdownChunks.push(formContent);
              }
            } else {
              // Fall back to simple text extraction
              const simpleText = extractSimpleText(textItems, pageHeight);
              if (simpleText.trim()) {
                markdownChunks.push(simpleText.trim());
              }
            }
          }

          // Extract annotations/comments
          const commentSection = await extractAnnotationComments(page);
          if (commentSection) {
            markdownChunks.push(commentSection);
          }
        } finally {
          page.cleanup();
        }
      }

      let markdown = markdownChunks.join('\n\n').trim();

      // If no pages had form-style content, the simple text path was used for all.
      // (In the Python version, this would fall back to pdfminer; here we've already
      // used the simple text extraction which is our equivalent.)

      // Post-process to merge MasterFormat-style partial numbering
      markdown = mergePartialNumberingLines(markdown);

      return { markdown };
    } finally {
      await doc.destroy();
    }
  }
}
