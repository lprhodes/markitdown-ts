// src/converters/docx.ts
import type { DocumentConverter, StreamInfo, ConverterInput, InternalConvertOptions, ConvertResult } from '../types.js';
import { MissingDependencyError } from '../errors.js';
import { HtmlConverter } from './html.js';

const ACCEPTED_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export class DocxConverter implements DocumentConverter {
  private htmlConverter = new HtmlConverter();

  accepts(info: StreamInfo): boolean {
    if (info.extension?.toLowerCase() === '.docx') return true;
    if (info.mimetype?.toLowerCase().startsWith(ACCEPTED_MIME)) return true;
    return false;
  }

  async convert(
    input: ConverterInput,
    info: StreamInfo,
    opts: InternalConvertOptions,
  ): Promise<ConvertResult | null> {
    let mammoth: typeof import('mammoth');
    let JSZip: typeof import('jszip');
    try {
      mammoth = await import('mammoth');
    } catch {
      throw new MissingDependencyError('mammoth', 'pnpm add mammoth');
    }
    try {
      JSZip = await import('jszip');
    } catch {
      throw new MissingDependencyError('jszip', 'pnpm add jszip');
    }

    const buffer = await input.buffer();

    // Pre-process: convert OMML math to LaTeX
    const processed = await this.preProcessDocx(buffer, JSZip);

    // Convert to HTML with mammoth
    const mammothOpts: any = { buffer: Buffer.from(processed) };
    if (opts.styleMap) mammothOpts.styleMap = opts.styleMap;
    const result = await mammoth.convertToHtml(mammothOpts);

    // Convert HTML to Markdown
    return this.htmlConverter.convertHtml(result.value, opts.keepDataUris);
  }

  private async preProcessDocx(
    buffer: Uint8Array,
    JSZip: typeof import('jszip'),
  ): Promise<Uint8Array> {
    const zip = await JSZip.default.loadAsync(buffer);

    const xmlFiles = [
      'word/document.xml',
      'word/footnotes.xml',
      'word/endnotes.xml',
    ];

    let modified = false;

    for (const path of xmlFiles) {
      const file = zip.file(path);
      if (!file) continue;

      const xml = await file.async('string');
      if (!xml.includes('oMath')) continue;

      const { processOmmlInXml } = await import('../utils/docx-math/omml-to-latex.js');
      const newXml = processOmmlInXml(xml);
      if (newXml !== xml) {
        zip.file(path, newXml);
        modified = true;
      }
    }

    if (!modified) return buffer;
    const output = await zip.generateAsync({ type: 'uint8array' });
    return output;
  }
}
