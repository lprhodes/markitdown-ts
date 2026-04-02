import { M as MarkItDownRegistrar, a as MarkItDownOptions, D as DocumentConverter, C as ConvertOptions, b as ConvertResult } from './types-Cj7TYQWp.js';
export { c as ConverterInput, d as ConverterRegistration, I as InternalConvertOptions, e as MarkItDownPlugin, N as NodeServices, S as StreamInfo } from './types-Cj7TYQWp.js';
import '@ai-sdk/provider';

declare class MarkItDown implements MarkItDownRegistrar {
    private registry;
    private options;
    constructor(options?: MarkItDownOptions);
    registerConverter(converter: DocumentConverter, options: {
        priority?: number;
        extensions: string[];
        mimeTypes: string[];
    }): void;
    convert(source: string, options?: ConvertOptions): Promise<ConvertResult>;
    convertBuffer(buffer: Uint8Array, options?: ConvertOptions): Promise<ConvertResult>;
    convertStream(stream: ReadableStream<Uint8Array> | NodeJS.ReadableStream, options?: ConvertOptions): Promise<ConvertResult>;
    convertResponse(response: Response, options?: ConvertOptions): Promise<ConvertResult>;
    private buildLlmCaption;
    private dispatch;
    private enableBuiltins;
}

declare class MarkItDownError extends Error {
    constructor(message: string);
}
declare class MissingDependencyError extends MarkItDownError {
    readonly dependency: string;
    readonly installCommand: string;
    constructor(dependency: string, installCommand: string);
}
declare class UnsupportedFormatError extends MarkItDownError {
    constructor(detail: string);
}
interface FailedConversionAttempt {
    converter: string;
    error: Error;
}
declare class FileConversionError extends MarkItDownError {
    readonly attempts: FailedConversionAttempt[];
    constructor(attempts: FailedConversionAttempt[]);
}
declare class FileTooLargeError extends MarkItDownError {
    readonly size: number;
    readonly limit: number;
    constructor(size: number, limit: number);
}

declare const PRIORITY_SPECIFIC = 0;
declare const PRIORITY_GENERIC = 10;

declare enum FileType {
    PDF = "pdf",
    DOCX = "docx",
    XLSX = "xlsx",
    XLS = "xls",
    PPTX = "pptx",
    HTML = "html",
    CSV = "csv",
    EPUB = "epub",
    RSS = "rss",
    ATOM = "atom",
    XML = "xml",
    IPYNB = "ipynb",
    JSON = "json",
    JSONL = "jsonl",
    TXT = "txt",
    MD = "md",
    MSG = "msg",
    ZIP = "zip",
    JPG = "jpg",
    JPEG = "jpeg",
    PNG = "png",
    GIF = "gif",
    BMP = "bmp",
    TIFF = "tiff",
    WEBP = "webp",
    SVG = "svg",
    MP3 = "mp3",
    WAV = "wav",
    M4A = "m4a",
    OGG = "ogg",
    FLAC = "flac",
    AAC = "aac",
    WMA = "wma",
    MP4 = "mp4"
}
interface MarkItDownInput extends MarkItDownOptions {
    /** File type hint for format detection. Auto-detected from file paths, URLs, and response headers when not provided. */
    type?: FileType | `${FileType}`;
    /** Preserve base64 data URIs in output (default: false) */
    keepDataUris?: boolean;
    /** Allow fetching http/https URLs (default: false, SSRF protection) */
    allowUrlFetch?: boolean;
}
/** Duck-type check for Axios-style responses */
interface AxiosLikeResponse {
    data: unknown;
    headers: Record<string, unknown> & {
        'content-type'?: string;
        'content-disposition'?: string;
    };
    config?: {
        url?: string;
        responseType?: string;
    };
}
/**
 * Convert a file to Markdown in one call.
 *
 * Accepts a file path, URL, data URI, Uint8Array/Buffer, fetch Response,
 * or Axios response.
 */
declare function markitdown(source: string | Uint8Array | Response | AxiosLikeResponse, options?: MarkItDownInput): Promise<ConvertResult>;

export { ConvertOptions, ConvertResult, DocumentConverter, type FailedConversionAttempt, FileConversionError, FileTooLargeError, FileType, MarkItDown, MarkItDownError, type MarkItDownInput, MarkItDownOptions, MarkItDownRegistrar, MissingDependencyError, PRIORITY_GENERIC, PRIORITY_SPECIFIC, UnsupportedFormatError, markitdown };
