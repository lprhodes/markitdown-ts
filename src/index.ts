// src/index.ts
import { MarkItDown } from './markitdown.js';
import type { MarkItDownOptions, ConvertOptions, ConvertResult } from './types.js';

export { MarkItDown };

export interface MarkItDownInput extends MarkItDownOptions {
  /** Filename hint for format detection (e.g. 'report.pdf') */
  filename?: string;
  /** MIME type hint (e.g. 'application/pdf') */
  mimetype?: string;
  /** Character encoding hint (e.g. 'utf-8') */
  charset?: string;
  /** Preserve base64 data URIs in output (default: false) */
  keepDataUris?: boolean;
  /** Allow fetching http/https URLs (default: false, SSRF protection) */
  allowUrlFetch?: boolean;
}

/**
 * Convert a file to Markdown in one call.
 *
 * Accepts a file path, URL, data URI, Uint8Array/Buffer, or fetch Response.
 */
export async function markitdown(
  source: string | Uint8Array | Response,
  options?: MarkItDownInput,
): Promise<ConvertResult> {
  const {
    filename,
    mimetype,
    charset,
    keepDataUris,
    allowUrlFetch,
    ...mdOptions
  } = options ?? {};

  const convertOptions: ConvertOptions = {
    keepDataUris,
    allowUrlFetch,
    streamInfo: { filename, mimetype, charset },
  };
  const md = new MarkItDown(mdOptions);

  if (typeof source === 'string') {
    return md.convert(source, convertOptions);
  }
  if (source instanceof Response) {
    return md.convertResponse(source, convertOptions);
  }
  return md.convertBuffer(source, convertOptions);
}

export type {
  StreamInfo,
  ConvertResult,
  ConvertOptions,
  ConverterInput,
  DocumentConverter,
  ConverterRegistration,
  InternalConvertOptions,
  NodeServices,
  MarkItDownOptions,
  MarkItDownPlugin,
  MarkItDownRegistrar,
} from './types.js';
export {
  MarkItDownError,
  MissingDependencyError,
  UnsupportedFormatError,
  FileConversionError,
  FileTooLargeError,
} from './errors.js';
export type { FailedConversionAttempt } from './errors.js';
export { PRIORITY_SPECIFIC, PRIORITY_GENERIC } from './constants.js';
