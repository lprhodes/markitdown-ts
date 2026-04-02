# @lprhodes/markitdown-ts

TypeScript port of Microsoft's [markitdown](https://github.com/microsoft/markitdown) Python library. Converts documents and media files to Markdown, optimised for feeding content to LLMs as conversation context.

## Origin

This library is a ground-up TypeScript rewrite of [microsoft/markitdown](https://github.com/microsoft/markitdown) (Python). The Python library converts a wide range of file formats to Markdown for use with LLMs, RAG pipelines, and text analysis. This port brings the same capabilities to the JavaScript/TypeScript ecosystem.

## What's Different from the Python Original

### Architecture

- **Async throughout** -- all conversion methods return `Promise`, matching JS I/O patterns
- **Dual runtime** -- Edge-safe core (`@lprhodes/markitdown-ts`) + Node.js helpers (`@lprhodes/markitdown-ts/node`). The core contains zero imports of `fs`, `child_process`, `path`, or any Node built-in, making it safe for Vercel Edge Functions, Cloudflare Workers, and similar runtimes
- **Dependency injection** -- Node-only capabilities (file reading, EXIF extraction, audio transcription) are injected via `nodeServices` rather than conditionally imported
- **Indexed dispatch** -- converter lookup uses Map-based extension/MIME indexes instead of iterating all converters
- **All dependencies are optional peer deps** -- install only what you need; unused converters add zero bytes

### Enhancements

- **Security hardening** -- SSRF protection (URL fetch requires explicit opt-in), zip bomb limits (`maxUncompressedSize`), XXE prevention, XSS sanitisation, ZIP path traversal prevention
- **Size limits** -- configurable `maxBufferSize` (default 100MB) and `maxUncompressedSize` (default 200MB) prevent OOM from malicious inputs
- **Comment/annotation extraction** -- extracts comments from DOCX (`word/comments.xml`), XLSX (cell notes), PPTX (slide comments with author attribution), and PDF (text/highlight/freetext annotations). The Python original does not extract comments
- **AI SDK integration** -- pass any `LanguageModelV1` provider (Claude, Gemini, OpenAI, etc.) from Vercel AI SDK for image captioning, or supply a custom callback
- **Plugin system** -- extend with custom converters via the `MarkItDownPlugin` interface

### Excluded from Python Original

URL-specific converters (YouTube transcript, Wikipedia, Bing SERP) are excluded -- the intended use case is file uploads, not URL scraping.

## Supported Formats

| Format | Extensions | Dependencies |
|--------|-----------|-------------|
| PDF | `.pdf` | `pdfjs-dist` |
| Word | `.docx` | `mammoth`, `jszip`, `fast-xml-parser` |
| Excel | `.xlsx` | `exceljs` |
| PowerPoint | `.pptx` | `jszip`, `fast-xml-parser` |
| HTML | `.html`, `.htm` | `cheerio`, `turndown` |
| CSV | `.csv` | `papaparse` |
| EPUB | `.epub` | `jszip`, `fast-xml-parser`, `cheerio`, `turndown` |
| RSS/Atom | `.rss`, `.atom`, `.xml` | `fast-xml-parser` |
| Jupyter Notebook | `.ipynb` | -- |
| Plain Text | `.txt`, `.md`, `.json`, `.jsonl` | -- |
| Images | `.jpg`, `.png`, `.gif`, `.bmp`, `.tiff`, `.webp`, `.svg` | Optional: `ai` + provider for LLM captioning |
| Audio | `.mp3`, `.wav`, `.m4a`, `.ogg`, `.flac`, `.aac`, `.wma` | Optional: `fluent-ffmpeg` for transcription |
| Outlook Email | `.msg` | `cfb` |
| ZIP Archives | `.zip` | `jszip` |
| Azure Doc Intelligence | Configurable | `@azure-rest/ai-document-intelligence` |

## Installation

```bash
pnpm add @lprhodes/markitdown-ts

# Install dependencies for the formats you need:
pnpm add pdfjs-dist                    # PDF
pnpm add mammoth jszip fast-xml-parser # DOCX
pnpm add exceljs                       # XLSX
pnpm add jszip fast-xml-parser         # PPTX
pnpm add cheerio turndown              # HTML
pnpm add papaparse                     # CSV
```

## Usage

### Convert a File Path (Node.js)

```typescript
import { markitdown } from '@lprhodes/markitdown-ts';
import { createFsReader } from '@lprhodes/markitdown-ts/node';

const result = await markitdown('/path/to/report.pdf', {
  nodeServices: { readFile: createFsReader() },
});

console.log(result.markdown);
```

### Convert a URL

```typescript
import { markitdown } from '@lprhodes/markitdown-ts';

const result = await markitdown('https://example.com/document.docx', {
  allowUrlFetch: true,
});

console.log(result.markdown);
```

### Convert a Vercel Blob

```typescript
import { markitdown } from '@lprhodes/markitdown-ts';

// Blob URLs are regular https URLs -- just pass them in
const result = await markitdown(blobUrl, { allowUrlFetch: true });

console.log(result.markdown);
```

### Convert an Axios Response

```typescript
import axios from 'axios';
import { markitdown } from '@lprhodes/markitdown-ts';

// Use responseType: 'arraybuffer' for binary files (PDF, DOCX, XLSX, PPTX, etc.)
const response = await axios.get('https://example.com/report.pdf', {
  responseType: 'arraybuffer',
});

// Format is auto-detected from response headers
const result = await markitdown(response);

console.log(result.markdown);
```

For text-based formats (HTML, CSV, XML, JSON), the default response type works fine:

```typescript
const response = await axios.get('https://example.com/page.html');
const result = await markitdown(response);
```

### Convert a fetch Response

```typescript
import { markitdown } from '@lprhodes/markitdown-ts';

const response = await fetch('https://example.com/document.docx');
const result = await markitdown(response);

console.log(result.markdown);
```

### Convert a Buffer

When passing a raw buffer, the format is auto-detected from magic bytes (requires `file-type` peer dep). You can also specify the type explicitly:

```typescript
import { markitdown, FileType } from '@lprhodes/markitdown-ts';

// Auto-detected (install file-type: pnpm add file-type)
const result = await markitdown(buffer);

// Or specify the type explicitly
const result = await markitdown(buffer, { type: FileType.PDF });

// String values work too
const result = await markitdown(buffer, { type: 'pdf' });
```

### Next.js API Route (Edge Runtime)

```typescript
// app/api/convert/route.ts
import { markitdown } from '@lprhodes/markitdown-ts';

export const runtime = 'edge';

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get('file') as File;

  const result = await markitdown(new Uint8Array(await file.arrayBuffer()), {
    type: file.name.split('.').pop() as FileType,
  });

  return Response.json({ markdown: result.markdown });
}
```

### Express API Route (Node.js)

```typescript
import express from 'express';
import multer from 'multer';
import { markitdown } from '@lprhodes/markitdown-ts';

const upload = multer({ storage: multer.memoryStorage() });

app.post('/convert', upload.single('file'), async (req, res) => {
  // file-type auto-detects the format from the buffer
  const result = await markitdown(req.file.buffer);
  res.json({ markdown: result.markdown });
});
```

### With LLM Image Captioning

```typescript
import { markitdown } from '@lprhodes/markitdown-ts';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createFsReader } from '@lprhodes/markitdown-ts/node';

const google = createGoogleGenerativeAI({ apiKey: '...' });

const result = await markitdown('/path/to/photo.jpg', {
  nodeServices: { readFile: createFsReader() },
  llmModel: google('gemini-2.0-flash'),
  llmPrompt: 'Describe this image in detail.',
});
```

Or with a custom callback:

```typescript
const result = await markitdown(imageBuffer, {
  type: 'png',
  llmCaption: async (buffer, mimeType) => {
    return await myVisionApi.describe(buffer, mimeType);
  },
});
```

### With EXIF Metadata (Node.js)

```typescript
import { markitdown } from '@lprhodes/markitdown-ts';
import { createFsReader, createExiftoolReader } from '@lprhodes/markitdown-ts/node';

const result = await markitdown('/path/to/photo.jpg', {
  nodeServices: {
    readFile: createFsReader(),
    exiftool: createExiftoolReader(),
  },
});
// Markdown includes EXIF metadata (camera, GPS, date, etc.)
```

### Using the Class API

For repeated conversions or when you need to register custom converters, use the `MarkItDown` class directly to avoid re-initialising on every call:

```typescript
import { MarkItDown } from '@lprhodes/markitdown-ts';
import { createFsReader } from '@lprhodes/markitdown-ts/node';

const md = new MarkItDown({
  nodeServices: { readFile: createFsReader() },
});

const pdf = await md.convert('/path/to/report.pdf');
const docx = await md.convert('/path/to/document.docx');
const url = await md.convert('https://example.com/file.xlsx', { allowUrlFetch: true });
```

### Custom Converter Plugin

```typescript
import type { MarkItDownPlugin, MarkItDownRegistrar, DocumentConverter } from '@lprhodes/markitdown-ts';
import { MarkItDown, PRIORITY_SPECIFIC } from '@lprhodes/markitdown-ts';

class YamlConverter implements DocumentConverter {
  accepts(info) {
    return ['.yaml', '.yml'].includes(info.extension ?? '');
  }

  async convert(input) {
    const buffer = await input.buffer();
    const text = new TextDecoder().decode(buffer);
    return { markdown: '```yaml\n' + text + '\n```' };
  }
}

const yamlPlugin: MarkItDownPlugin = {
  name: 'yaml-converter',
  version: '1.0.0',
  register(md: MarkItDownRegistrar) {
    md.registerConverter(new YamlConverter(), {
      priority: PRIORITY_SPECIFIC,
      extensions: ['.yaml', '.yml'],
      mimeTypes: ['application/x-yaml'],
    });
  },
};

const md = new MarkItDown({ plugins: [yamlPlugin] });
const result = await md.convert('/path/to/config.yaml');
```

## Error Handling

```typescript
import {
  markitdown,
  MissingDependencyError,
  UnsupportedFormatError,
  FileConversionError,
  FileTooLargeError,
} from '@lprhodes/markitdown-ts';

try {
  const result = await markitdown(buffer, { type: 'pdf' });
} catch (err) {
  if (err instanceof MissingDependencyError) {
    // e.g. "Missing dependency: pdfjs-dist. Install it with: pnpm add pdfjs-dist"
    console.log(`Install: ${err.installCommand}`);
  } else if (err instanceof UnsupportedFormatError) {
    // No converter matched the file type
  } else if (err instanceof FileTooLargeError) {
    // File exceeds maxBufferSize
    console.log(`${err.size} bytes exceeds limit of ${err.limit}`);
  } else if (err instanceof FileConversionError) {
    // Converter(s) matched but all failed
    for (const attempt of err.attempts) {
      console.log(`${attempt.converter}: ${attempt.error.message}`);
    }
  }
}
```

## Configuration

All options can be passed to both `markitdown()` and `new MarkItDown()`:

```typescript
import { markitdown } from '@lprhodes/markitdown-ts';

const result = await markitdown('/path/to/file.docx', {
  // Size limits
  maxBufferSize: 50 * 1024 * 1024,       // 50MB (default: 100MB)
  maxUncompressedSize: 100 * 1024 * 1024, // 100MB (default: 200MB)

  // DOCX style mapping (passed to mammoth)
  styleMap: 'p[style-name="Quote"] => blockquote',

  // Custom fetch options (for URL conversion)
  requestInit: {
    headers: { Authorization: 'Bearer ...' },
  },

  // Azure Document Intelligence
  docintelEndpoint: 'https://myinstance.cognitiveservices.azure.com',
  docintelCredential: new DefaultAzureCredential(),
});
```

## Security

The library is designed for use in file-upload API endpoints and includes several security measures:

- **SSRF protection**: `convert(url)` requires explicit `allowUrlFetch: true`
- **Zip bomb protection**: `maxUncompressedSize` limits total extracted size from ZIP/EPUB archives
- **XXE prevention**: All XML parsing uses `processEntities: false`
- **XSS sanitisation**: HTML converter strips `<script>`, `<iframe>`, `<object>`, event handlers, and `javascript:` links before Markdown conversion
- **Path traversal prevention**: ZIP entry names are sanitised and never used as filesystem paths

## License

MIT
