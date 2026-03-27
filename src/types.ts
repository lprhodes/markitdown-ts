// src/types.ts

import type { LanguageModelV1 } from '@ai-sdk/provider';

export interface StreamInfo {
  readonly mimetype?: string;
  readonly extension?: string;
  readonly charset?: string;
  readonly filename?: string;
  readonly localPath?: string;
  readonly url?: string;
}

export interface ConvertResult {
  markdown: string;
  title?: string;
}

export interface ConvertOptions {
  streamInfo?: Partial<StreamInfo>;
  keepDataUris?: boolean;
  allowUrlFetch?: boolean;
}

export interface ConverterInput {
  stream: () => ReadableStream<Uint8Array>;
  buffer: () => Promise<Uint8Array>;
}

export interface DocumentConverter {
  accepts(info: StreamInfo): boolean;
  convert(
    input: ConverterInput,
    info: StreamInfo,
    opts: InternalConvertOptions,
  ): Promise<ConvertResult | null>;
}

export interface ConverterRegistration {
  converter: DocumentConverter;
  priority: number;
  extensions: string[];
  mimeTypes: string[];
}

export interface InternalConvertOptions {
  keepDataUris: boolean;
  maxBufferSize: number;
  maxUncompressedSize: number;
  llmCaption?: (buffer: Uint8Array, mimeType: string) => Promise<string>;
  nodeServices: NodeServices;
  styleMap?: string;
  parentConverters?: ConverterRegistration[];
  convertBuffer?: (buffer: Uint8Array, options?: ConvertOptions) => Promise<ConvertResult>;
}

export interface NodeServices {
  readFile?: (path: string) => Promise<Uint8Array>;
  exiftool?: (input: ConverterInput, info: StreamInfo) => Promise<Record<string, unknown>>;
  transcribeAudio?: (input: ConverterInput, info: StreamInfo) => Promise<string>;
}

export interface MarkItDownOptions {
  enableBuiltins?: boolean;
  enablePlugins?: boolean;
  plugins?: MarkItDownPlugin[];
  llmModel?: LanguageModelV1;
  llmPrompt?: string;
  llmCaption?: (buffer: Uint8Array, mimeType: string) => Promise<string>;
  styleMap?: string;
  requestInit?: RequestInit;
  docintelEndpoint?: string;
  docintelCredential?: unknown;
  docintelFileTypes?: string[];
  docintelApiVersion?: string;
  maxBufferSize?: number;
  maxUncompressedSize?: number;
  nodeServices?: NodeServices;
}

export interface MarkItDownPlugin {
  name: string;
  version: string;
  register(md: MarkItDownRegistrar, options: Record<string, unknown>): void;
}

export interface MarkItDownRegistrar {
  registerConverter(
    converter: DocumentConverter,
    options: { priority?: number; extensions: string[]; mimeTypes: string[] },
  ): void;
}

// Re-export LanguageModelV1 type for convenience (optional peer dep)
export type { LanguageModelV1 } from '@ai-sdk/provider';
