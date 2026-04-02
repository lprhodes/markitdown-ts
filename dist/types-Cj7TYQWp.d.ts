import { LanguageModelV1 } from '@ai-sdk/provider';

interface StreamInfo {
    readonly mimetype?: string;
    readonly extension?: string;
    readonly charset?: string;
    readonly filename?: string;
    readonly localPath?: string;
    readonly url?: string;
}
interface ConvertResult {
    markdown: string;
    title?: string;
}
interface ConvertOptions {
    streamInfo?: Partial<StreamInfo>;
    keepDataUris?: boolean;
    allowUrlFetch?: boolean;
}
interface ConverterInput {
    stream: () => ReadableStream<Uint8Array>;
    buffer: () => Promise<Uint8Array>;
}
interface DocumentConverter {
    accepts(info: StreamInfo): boolean;
    convert(input: ConverterInput, info: StreamInfo, opts: InternalConvertOptions): Promise<ConvertResult | null>;
}
interface ConverterRegistration {
    converter: DocumentConverter;
    priority: number;
    extensions: string[];
    mimeTypes: string[];
}
interface InternalConvertOptions {
    keepDataUris: boolean;
    maxBufferSize: number;
    maxUncompressedSize: number;
    llmCaption?: (buffer: Uint8Array, mimeType: string) => Promise<string>;
    nodeServices: NodeServices;
    styleMap?: string;
    parentConverters?: ConverterRegistration[];
    convertBuffer?: (buffer: Uint8Array, options?: ConvertOptions) => Promise<ConvertResult>;
}
interface NodeServices {
    readFile?: (path: string) => Promise<Uint8Array>;
    exiftool?: (input: ConverterInput, info: StreamInfo) => Promise<Record<string, unknown>>;
    transcribeAudio?: (input: ConverterInput, info: StreamInfo) => Promise<string>;
}
interface MarkItDownOptions {
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
interface MarkItDownPlugin {
    name: string;
    version: string;
    register(md: MarkItDownRegistrar, options: Record<string, unknown>): void;
}
interface MarkItDownRegistrar {
    registerConverter(converter: DocumentConverter, options: {
        priority?: number;
        extensions: string[];
        mimeTypes: string[];
    }): void;
}

export type { ConvertOptions as C, DocumentConverter as D, InternalConvertOptions as I, MarkItDownRegistrar as M, NodeServices as N, StreamInfo as S, MarkItDownOptions as a, ConvertResult as b, ConverterInput as c, ConverterRegistration as d, MarkItDownPlugin as e };
