// src/index.ts
import { MarkItDown } from './markitdown.js';
import type { MarkItDownOptions, ConvertOptions, ConvertResult } from './types.js';

export { MarkItDown };

/**
 * Convert a file to Markdown in one call.
 *
 * Accepts a file path, URL, data URI, Uint8Array/Buffer, or fetch Response.
 * Optionally pass MarkItDownOptions as a second argument to configure the
 * converter instance, and ConvertOptions as a third to control per-call
 * behaviour.
 */
export async function markitdown(
  source: string | Uint8Array | Response,
  options?: MarkItDownOptions & ConvertOptions,
): Promise<ConvertResult> {
  const {
    // ConvertOptions fields
    streamInfo,
    keepDataUris,
    allowUrlFetch,
    // Everything else is MarkItDownOptions
    ...mdOptions
  } = options ?? {};

  const convertOptions: ConvertOptions = { streamInfo, keepDataUris, allowUrlFetch };
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
