// src/converters/xlsx.ts
import type { DocumentConverter, StreamInfo, ConverterInput, InternalConvertOptions, ConvertResult } from '../types.js';
import { MissingDependencyError, UnsupportedFormatError } from '../errors.js';

const ACCEPTED_XLSX_EXTENSIONS = ['.xlsx'];
const ACCEPTED_XLSX_MIMES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];
const ACCEPTED_XLS_EXTENSIONS = ['.xls'];
const ACCEPTED_XLS_MIMES = [
  'application/vnd.ms-excel',
  'application/excel',
];

export class XlsxConverter implements DocumentConverter {
  accepts(info: StreamInfo): boolean {
    const ext = (info.extension ?? '').toLowerCase();
    const mime = (info.mimetype ?? '').toLowerCase();

    if (ACCEPTED_XLSX_EXTENSIONS.includes(ext)) return true;
    if (ACCEPTED_XLS_EXTENSIONS.includes(ext)) return true;

    for (const m of ACCEPTED_XLSX_MIMES) {
      if (mime.startsWith(m)) return true;
    }
    for (const m of ACCEPTED_XLS_MIMES) {
      if (mime.startsWith(m)) return true;
    }

    return false;
  }

  async convert(
    input: ConverterInput,
    info: StreamInfo,
    _opts: InternalConvertOptions,
  ): Promise<ConvertResult | null> {
    const ext = (info.extension ?? '').toLowerCase();

    // .xls is not supported
    if (ACCEPTED_XLS_EXTENSIONS.includes(ext)) {
      throw new UnsupportedFormatError('.xls files are not supported. Convert to .xlsx first.');
    }

    let ExcelJS: typeof import('exceljs');
    try {
      ExcelJS = await import('exceljs');
    } catch {
      throw new MissingDependencyError('exceljs', 'pnpm add exceljs');
    }

    const buffer = await input.buffer();
    const workbook = new ExcelJS.default.Workbook();
    await workbook.xlsx.load(buffer as Buffer);

    let mdContent = '';

    workbook.eachSheet((worksheet) => {
      mdContent += `## ${worksheet.name}\n`;

      const rows: string[][] = [];
      let maxCols = 0;

      worksheet.eachRow((row) => {
        const cells: string[] = [];
        // row.values is 1-indexed (index 0 is undefined)
        const values = row.values as any[];
        for (let i = 1; i < values.length; i++) {
          cells.push(this.formatCell(values[i]));
        }
        if (cells.length > maxCols) maxCols = cells.length;
        rows.push(cells);
      });

      if (rows.length === 0) {
        mdContent += '\n';
        return;
      }

      // Pad rows to same column count
      for (const row of rows) {
        while (row.length < maxCols) {
          row.push('');
        }
      }

      // First row is header
      const header = rows[0];
      mdContent += '| ' + header.join(' | ') + ' |\n';
      mdContent += '| ' + header.map(() => '---').join(' | ') + ' |\n';

      for (let i = 1; i < rows.length; i++) {
        mdContent += '| ' + rows[i].join(' | ') + ' |\n';
      }

      // Extract cell comments/notes
      const comments: { cell: string; text: string }[] = [];
      worksheet.eachRow((row, rowNumber) => {
        row.eachCell((cell, colNumber) => {
          if (cell.note) {
            const cellRef = `${String.fromCharCode(64 + colNumber)}${rowNumber}`;
            let text: string;
            if (typeof cell.note === 'string') {
              text = cell.note;
            } else {
              text = ((cell.note as any).texts || []).map((t: any) => t.text).join('');
            }
            if (text.trim()) {
              comments.push({ cell: cellRef, text: text.trim() });
            }
          }
        });
      });

      if (comments.length > 0) {
        mdContent += '\n### Comments\n';
        for (const c of comments) {
          mdContent += `- **${c.cell}**: ${c.text}\n`;
        }
      }

      mdContent += '\n';
    });

    return { markdown: mdContent.trimEnd() };
  }

  private formatCell(value: unknown): string {
    if (value == null) return '';
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (typeof value === 'object') {
      // ExcelJS rich text: { richText: [{text: '...'}] }
      if ('richText' in (value as any)) {
        return ((value as any).richText as any[])
          .map((rt: any) => rt.text ?? '')
          .join('');
      }
      // ExcelJS formula result
      if ('result' in (value as any)) {
        return this.formatCell((value as any).result);
      }
      // ExcelJS hyperlink
      if ('text' in (value as any)) {
        return String((value as any).text);
      }
      return String(value);
    }
    return String(value);
  }
}
