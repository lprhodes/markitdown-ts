import {
  SAFE_XML_OPTIONS
} from "./chunk-DBWGSGT6.js";

// src/constants.ts
var PRIORITY_SPECIFIC = 0;
var PRIORITY_GENERIC = 10;
var DEFAULT_MAX_BUFFER_SIZE = 100 * 1024 * 1024;
var DEFAULT_MAX_UNCOMPRESSED_SIZE = 200 * 1024 * 1024;

// src/converter-registry.ts
var ConverterRegistry = class {
  registrations = [];
  extensionIndex = /* @__PURE__ */ new Map();
  mimeIndex = /* @__PURE__ */ new Map();
  fallbackConverters = [];
  nextInsertOrder = 0;
  dirty = true;
  sortedCache = [];
  register(converter, options) {
    const priority = options.priority ?? 0;
    const reg = {
      converter,
      priority,
      extensions: options.extensions,
      mimeTypes: options.mimeTypes
    };
    reg._insertOrder = this.nextInsertOrder++;
    this.registrations.push(reg);
    this.dirty = true;
    for (const ext of options.extensions) {
      const key = ext.toLowerCase();
      if (!this.extensionIndex.has(key)) this.extensionIndex.set(key, []);
      this.extensionIndex.get(key).push(reg);
    }
    for (const mime of options.mimeTypes) {
      const key = mime.toLowerCase();
      if (!this.mimeIndex.has(key)) this.mimeIndex.set(key, []);
      this.mimeIndex.get(key).push(reg);
    }
    if (priority >= PRIORITY_GENERIC) {
      this.fallbackConverters.push(reg);
    }
  }
  findConverters(info) {
    const candidates = /* @__PURE__ */ new Set();
    if (info.extension) {
      const ext = info.extension.toLowerCase();
      const byExt = this.extensionIndex.get(ext);
      if (byExt) byExt.forEach((r) => candidates.add(r));
    }
    if (info.mimetype) {
      const mime = info.mimetype.toLowerCase();
      const exact = this.mimeIndex.get(mime);
      if (exact) exact.forEach((r) => candidates.add(r));
      for (const [key, regs] of this.mimeIndex) {
        if (key.endsWith("/") && mime.startsWith(key)) {
          regs.forEach((r) => candidates.add(r));
        } else if (mime.startsWith(key)) {
          regs.forEach((r) => candidates.add(r));
        }
      }
    }
    if (candidates.size === 0) {
      for (const fb of this.fallbackConverters) {
        candidates.add(fb);
      }
    }
    const arr = [...candidates];
    arr.sort((a, b) => {
      const pDiff = a.priority - b.priority;
      if (pDiff !== 0) return pDiff;
      return b._insertOrder - a._insertOrder;
    });
    return arr;
  }
  getAll() {
    if (this.dirty) {
      this.sortedCache = [...this.registrations];
      this.sortedCache.sort((a, b) => {
        const pDiff = a.priority - b.priority;
        if (pDiff !== 0) return pDiff;
        return b._insertOrder - a._insertOrder;
      });
      this.dirty = false;
    }
    return this.sortedCache;
  }
};

// src/errors.ts
var MarkItDownError = class extends Error {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
  }
};
var MissingDependencyError = class extends MarkItDownError {
  constructor(dependency, installCommand) {
    super(
      `Missing dependency: ${dependency}. Install it with: ${installCommand}`
    );
    this.dependency = dependency;
    this.installCommand = installCommand;
  }
};
var UnsupportedFormatError = class extends MarkItDownError {
  constructor(detail) {
    super(`Unsupported format: ${detail}`);
  }
};
var FileConversionError = class extends MarkItDownError {
  constructor(attempts) {
    const names = attempts.map((a) => a.converter).join(", ");
    super(`Conversion failed. Attempted converters: ${names}`);
    this.attempts = attempts;
  }
};
var FileTooLargeError = class extends MarkItDownError {
  constructor(size, limit) {
    super(
      `File too large: ${size} bytes exceeds limit of ${limit} bytes`
    );
    this.size = size;
    this.limit = limit;
  }
};

// src/converter-input.ts
function createConverterInputFromBuffer(data, maxBufferSize) {
  if (data.byteLength > maxBufferSize) {
    throw new FileTooLargeError(data.byteLength, maxBufferSize);
  }
  return {
    stream: () => new ReadableStream({
      start(controller) {
        controller.enqueue(data);
        controller.close();
      }
    }),
    buffer: () => Promise.resolve(data)
  };
}
function createConverterInputFromStream(source, maxBufferSize) {
  let cached;
  const ensureBuffered = async () => {
    if (cached) return cached;
    const reader = source.getReader();
    const chunks = [];
    let totalSize = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        totalSize += value.byteLength;
        if (totalSize > maxBufferSize) {
          throw new FileTooLargeError(totalSize, maxBufferSize);
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    if (chunks.length === 1) {
      cached = chunks[0];
    } else {
      cached = new Uint8Array(totalSize);
      let offset = 0;
      for (const chunk of chunks) {
        cached.set(chunk, offset);
        offset += chunk.byteLength;
      }
    }
    return cached;
  };
  return {
    stream: () => {
      if (cached) {
        return new ReadableStream({
          start(controller) {
            controller.enqueue(cached);
            controller.close();
          }
        });
      }
      return new ReadableStream({
        async start(controller) {
          const buf = await ensureBuffered();
          controller.enqueue(buf);
          controller.close();
        }
      });
    },
    buffer: ensureBuffered
  };
}

// src/stream-info.ts
var EXT_TO_MIME = {
  ".pdf": "application/pdf",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".xls": "application/vnd.ms-excel",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".html": "text/html",
  ".htm": "text/html",
  ".txt": "text/plain",
  ".text": "text/plain",
  ".md": "text/markdown",
  ".markdown": "text/markdown",
  ".json": "application/json",
  ".jsonl": "application/json",
  ".csv": "text/csv",
  ".xml": "text/xml",
  ".rss": "application/rss+xml",
  ".atom": "application/atom+xml",
  ".epub": "application/epub+zip",
  ".ipynb": "application/x-ipynb+json",
  ".msg": "application/vnd.ms-outlook",
  ".zip": "application/zip",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".wav": "audio/x-wav",
  ".mp3": "audio/mpeg",
  ".m4a": "audio/mp4",
  ".mp4": "video/mp4"
};
var MIME_TO_EXT = {};
for (const [ext, mime] of Object.entries(EXT_TO_MIME)) {
  if (!MIME_TO_EXT[mime]) MIME_TO_EXT[mime] = ext;
}
function extensionToMime(ext) {
  return EXT_TO_MIME[ext.toLowerCase()];
}
function mimeToExtension(mime) {
  return MIME_TO_EXT[mime.toLowerCase()];
}
function extractExtension(filename) {
  const dot = filename.lastIndexOf(".");
  if (dot === -1 || dot === filename.length - 1) return void 0;
  return filename.slice(dot).toLowerCase();
}
function buildStreamInfo(partial) {
  let { mimetype, extension, charset, filename, localPath, url } = partial;
  if (!extension && filename) {
    extension = extractExtension(filename);
  }
  if (!extension && localPath) {
    const name = localPath.split("/").pop() ?? localPath;
    extension = extractExtension(name);
  }
  if (extension && !mimetype) {
    mimetype = extensionToMime(extension);
  }
  if (mimetype && !extension) {
    extension = mimeToExtension(mimetype);
  }
  return { mimetype, extension, charset, filename, localPath, url };
}

// src/normalize.ts
var TRAILING_WHITESPACE = /[ \t]+$/gm;
var EXCESSIVE_NEWLINES = /\n{3,}/g;
function normalizeOutput(text) {
  return text.replace(TRAILING_WHITESPACE, "").replace(EXCESSIVE_NEWLINES, "\n\n").trim();
}

// src/uri-utils.ts
function fileUriToPath(uri) {
  const authorityMatch = uri.match(/^file:\/\/([^/?#]*)(\/[^?#]*)/);
  if (authorityMatch) {
    const netloc2 = decodeURIComponent(authorityMatch[1]);
    const path2 = decodeURIComponent(authorityMatch[2]);
    return { netloc: netloc2, path: path2 };
  }
  const url = new URL(uri);
  const netloc = url.hostname;
  const path = decodeURIComponent(url.pathname);
  return { netloc, path };
}
function parseDataUri(uri) {
  const match = uri.match(/^data:([^,]*),(.*)$/s);
  if (!match) throw new Error(`Invalid data URI: ${uri.slice(0, 50)}...`);
  const [, meta, body] = match;
  const parts = meta.split(";");
  const mimetype = parts[0] || "text/plain";
  const isBase64 = parts.includes("base64");
  let charset;
  for (const part of parts) {
    const eq = part.indexOf("=");
    if (eq !== -1 && part.slice(0, eq).trim() === "charset") {
      charset = part.slice(eq + 1).trim();
    }
  }
  let data;
  if (isBase64) {
    const binary = atob(body);
    data = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  } else {
    data = new TextEncoder().encode(decodeURIComponent(body));
  }
  return { mimetype, charset, data };
}

// src/utils/charset.ts
var CHARSET_ALIASES = {
  cp932: "shift_jis",
  "cp-932": "shift_jis",
  cp949: "euc-kr",
  cp1250: "windows-1250",
  cp1251: "windows-1251",
  cp1252: "windows-1252",
  cp1253: "windows-1253",
  cp1254: "windows-1254",
  cp1255: "windows-1255",
  cp1256: "windows-1256",
  cp1257: "windows-1257",
  cp1258: "windows-1258",
  cp874: "windows-874",
  latin1: "windows-1252",
  "iso-8859-1": "windows-1252",
  ascii: "utf-8"
};
function normalizeCharset(charset) {
  const lower = charset.toLowerCase().trim();
  return CHARSET_ALIASES[lower] ?? lower;
}
function decodeBuffer(buffer, charset) {
  const normalized = normalizeCharset(charset);
  const decoder = new TextDecoder(normalized);
  return decoder.decode(buffer);
}

// src/converters/plain-text.ts
var ACCEPTED_MIME_PREFIXES = ["text/", "application/json", "application/markdown"];
var ACCEPTED_EXTENSIONS = [".txt", ".text", ".md", ".markdown", ".json", ".jsonl"];
var PlainTextConverter = class {
  accepts(info) {
    if (info.charset) return true;
    if (info.extension && ACCEPTED_EXTENSIONS.includes(info.extension.toLowerCase())) return true;
    if (info.mimetype) {
      const mime = info.mimetype.toLowerCase();
      return ACCEPTED_MIME_PREFIXES.some((p) => mime.startsWith(p));
    }
    return false;
  }
  async convert(input, info, _opts) {
    const buffer = await input.buffer();
    let text;
    if (info.charset) {
      text = decodeBuffer(buffer, info.charset);
    } else {
      try {
        const chardet = await import("chardet");
        const detected = chardet.detect(Buffer.from(buffer));
        text = decodeBuffer(buffer, detected ?? "utf-8");
      } catch {
        text = new TextDecoder("utf-8").decode(buffer);
      }
    }
    return { markdown: text };
  }
};

// src/converters/ipynb.ts
var IpynbConverter = class {
  accepts(info) {
    if (info.extension?.toLowerCase() === ".ipynb") return true;
    if (info.mimetype?.toLowerCase() === "application/x-ipynb+json") return true;
    return false;
  }
  async convert(input, info, _opts) {
    const buffer = await input.buffer();
    const text = new TextDecoder("utf-8").decode(buffer);
    let notebook;
    try {
      notebook = JSON.parse(text);
    } catch {
      return null;
    }
    if (!("nbformat" in notebook)) return null;
    const cells = [];
    let title;
    if (notebook.metadata?.title) {
      title = notebook.metadata.title;
    }
    for (const cell of notebook.cells ?? []) {
      const source = Array.isArray(cell.source) ? cell.source.join("") : cell.source ?? "";
      if (cell.cell_type === "markdown") {
        cells.push(source);
        if (!title) {
          const match = source.match(/^#\s+(.+)$/m);
          if (match) title = match[1];
        }
      } else if (cell.cell_type === "code") {
        cells.push("```python\n" + source + "\n```");
      } else if (cell.cell_type === "raw") {
        cells.push("```\n" + source + "\n```");
      }
    }
    return { markdown: cells.join("\n\n"), title };
  }
};

// src/converters/csv.ts
var ACCEPTED_MIMES = ["text/csv", "application/csv"];
var ACCEPTED_EXTENSIONS2 = [".csv"];
var CsvConverter = class {
  accepts(info) {
    if (info.extension && ACCEPTED_EXTENSIONS2.includes(info.extension.toLowerCase())) return true;
    if (info.mimetype && ACCEPTED_MIMES.includes(info.mimetype.toLowerCase())) return true;
    return false;
  }
  async convert(input, info, _opts) {
    let Papa;
    try {
      Papa = await import("papaparse");
    } catch {
      throw new MissingDependencyError("papaparse", "pnpm add papaparse");
    }
    const buffer = await input.buffer();
    let text;
    if (info.charset) {
      text = decodeBuffer(buffer, info.charset);
    } else {
      try {
        const chardet = await import("chardet");
        const detected = chardet.detect(Buffer.from(buffer));
        text = decodeBuffer(buffer, detected ?? "utf-8");
      } catch {
        text = new TextDecoder("utf-8").decode(buffer);
      }
    }
    const result = Papa.parse(text, { header: false, skipEmptyLines: true });
    const rows = result.data;
    if (rows.length === 0) return { markdown: "" };
    const header = rows[0];
    const numCols = header.length;
    const lines = [];
    lines.push("| " + header.join(" | ") + " |");
    lines.push("| " + header.map(() => "---").join(" | ") + " |");
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const cells = [];
      for (let j = 0; j < numCols; j++) {
        cells.push(row[j] ?? "");
      }
      lines.push("| " + cells.join(" | ") + " |");
    }
    return { markdown: lines.join("\n") };
  }
};

// src/converters/html.ts
var ACCEPTED_MIMES2 = ["text/html", "application/xhtml"];
var ACCEPTED_EXTENSIONS3 = [".html", ".htm"];
var HtmlConverter = class {
  accepts(info) {
    if (info.extension && ACCEPTED_EXTENSIONS3.includes(info.extension.toLowerCase())) return true;
    if (info.mimetype) {
      const mime = info.mimetype.toLowerCase();
      return ACCEPTED_MIMES2.some((m) => mime.startsWith(m));
    }
    return false;
  }
  async convert(input, info, opts) {
    const buffer = await input.buffer();
    const charset = info.charset ?? "utf-8";
    const html = new TextDecoder(charset).decode(buffer);
    return this.convertHtml(html, opts.keepDataUris);
  }
  async convertHtml(html, keepDataUris = false) {
    let cheerio;
    let TurndownService;
    try {
      cheerio = await import("cheerio");
    } catch {
      throw new MissingDependencyError("cheerio", "pnpm add cheerio");
    }
    try {
      TurndownService = await import("turndown");
    } catch {
      throw new MissingDependencyError("turndown", "pnpm add turndown");
    }
    const $ = cheerio.load(html);
    $("script, style, iframe, object, embed, applet, form").remove();
    $("*").each((_, el) => {
      const attribs = $(el).attr();
      for (const attr of Object.keys(attribs ?? {})) {
        if (attr.startsWith("on")) $(el).removeAttr(attr);
      }
    });
    const title = $("title").first().text().trim() || void 0;
    const body = $("body").html() ?? $.html();
    const td = new TurndownService.default({
      headingStyle: "atx",
      codeBlockStyle: "fenced"
    });
    td.addRule("noJsLinks", {
      filter: (node) => {
        if (node.nodeName !== "A") return false;
        const href = node.getAttribute("href") ?? "";
        if (href.startsWith("javascript:")) return true;
        if (href.includes(":") && !href.match(/^(https?|file):/i)) return true;
        return false;
      },
      replacement: (_content, node) => node.textContent ?? ""
    });
    td.addRule("truncateDataUris", {
      filter: "img",
      replacement: (_content, node) => {
        const alt = node.getAttribute("alt") ?? "";
        let src = node.getAttribute("src") ?? "";
        if (!keepDataUris && src.startsWith("data:")) {
          const commaIdx = src.indexOf(",");
          if (commaIdx !== -1) {
            src = src.slice(0, commaIdx).replace(";base64", ";base64...");
            if (!src.endsWith("...")) src += "...";
          }
        }
        return `![${alt}](${src})`;
      }
    });
    td.addRule("checkboxes", {
      filter: (node) => node.nodeName === "INPUT" && node.getAttribute("type") === "checkbox",
      replacement: (_content, node) => node.getAttribute("checked") !== null ? "[x] " : "[ ] "
    });
    const markdown = td.turndown(body);
    return { markdown, title };
  }
};

// src/converters/docx.ts
var ACCEPTED_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
var DocxConverter = class {
  htmlConverter = new HtmlConverter();
  accepts(info) {
    if (info.extension?.toLowerCase() === ".docx") return true;
    if (info.mimetype?.toLowerCase().startsWith(ACCEPTED_MIME)) return true;
    return false;
  }
  async convert(input, info, opts) {
    let mammoth;
    let JSZip;
    try {
      mammoth = await import("mammoth");
    } catch {
      throw new MissingDependencyError("mammoth", "pnpm add mammoth");
    }
    try {
      JSZip = await import("jszip");
    } catch {
      throw new MissingDependencyError("jszip", "pnpm add jszip");
    }
    const buffer = await input.buffer();
    const processed = await this.preProcessDocx(buffer, JSZip);
    const mammothOpts = { buffer: Buffer.from(processed) };
    if (opts.styleMap) mammothOpts.styleMap = opts.styleMap;
    const result = await mammoth.convertToHtml(mammothOpts);
    const mdResult = await this.htmlConverter.convertHtml(result.value, opts.keepDataUris);
    if (!mdResult) return null;
    const zip = await JSZip.default.loadAsync(buffer);
    const commentsSection = await this.extractComments(zip);
    if (commentsSection) {
      mdResult.markdown = mdResult.markdown + "\n\n" + commentsSection;
    }
    return mdResult;
  }
  async extractComments(zip) {
    const commentsFile = zip.file("word/comments.xml");
    if (!commentsFile) return null;
    const xml = await commentsFile.async("string");
    const commentRegex = /<w:comment\b[^>]*>([\s\S]*?)<\/w:comment>/g;
    const comments = [];
    let match;
    while ((match = commentRegex.exec(xml)) !== null) {
      const commentBlock = match[0];
      const authorMatch = commentBlock.match(/w:author="([^"]*)"/);
      const author = authorMatch?.[1] ?? "";
      const textParts = [];
      const textRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
      let textMatch;
      while ((textMatch = textRegex.exec(commentBlock)) !== null) {
        textParts.push(textMatch[1]);
      }
      const text = textParts.join("").trim();
      if (text) {
        comments.push({ author, text });
      }
    }
    if (comments.length === 0) return null;
    let section = "### Comments\n";
    for (const c of comments) {
      if (c.author) {
        section += `- **${c.author}**: ${c.text}
`;
      } else {
        section += `- ${c.text}
`;
      }
    }
    return section.trimEnd();
  }
  async preProcessDocx(buffer, JSZip) {
    const zip = await JSZip.default.loadAsync(buffer);
    const xmlFiles = [
      "word/document.xml",
      "word/footnotes.xml",
      "word/endnotes.xml"
    ];
    let modified = false;
    for (const path of xmlFiles) {
      const file = zip.file(path);
      if (!file) continue;
      const xml = await file.async("string");
      if (!xml.includes("oMath")) continue;
      const { processOmmlInXml } = await import("./omml-to-latex-GWB6FLCZ.js");
      const newXml = processOmmlInXml(xml);
      if (newXml !== xml) {
        zip.file(path, newXml);
        modified = true;
      }
    }
    if (!modified) return buffer;
    const output = await zip.generateAsync({ type: "uint8array" });
    return output;
  }
};

// src/converters/rss.ts
import { XMLParser } from "fast-xml-parser";
var PRECISE_EXTENSIONS = [".rss", ".atom"];
var PRECISE_MIME_PREFIXES = [
  "application/rss",
  "application/rss+xml",
  "application/atom",
  "application/atom+xml"
];
var CANDIDATE_EXTENSIONS = [".xml"];
var CANDIDATE_MIME_PREFIXES = ["text/xml", "application/xml"];
var RssConverter = class {
  htmlConverter = new HtmlConverter();
  accepts(info) {
    const ext = (info.extension ?? "").toLowerCase();
    const mime = (info.mimetype ?? "").toLowerCase();
    if (PRECISE_EXTENSIONS.includes(ext)) return true;
    for (const prefix of PRECISE_MIME_PREFIXES) {
      if (mime.startsWith(prefix)) return true;
    }
    if (CANDIDATE_EXTENSIONS.includes(ext)) return true;
    for (const prefix of CANDIDATE_MIME_PREFIXES) {
      if (mime.startsWith(prefix)) return true;
    }
    return false;
  }
  async convert(input, _info, _opts) {
    const buffer = await input.buffer();
    const xml = new TextDecoder("utf-8").decode(buffer);
    const parser = new XMLParser(SAFE_XML_OPTIONS);
    let doc;
    try {
      doc = parser.parse(xml);
    } catch {
      return null;
    }
    const feedType = this.detectFeedType(doc);
    if (feedType === "rss") {
      return this.parseRss(doc);
    } else if (feedType === "atom") {
      return this.parseAtom(doc);
    }
    return null;
  }
  detectFeedType(doc) {
    if (doc.rss) return "rss";
    if (doc.feed) {
      const feed = doc.feed;
      if (feed.entry) return "atom";
    }
    return null;
  }
  async parseRss(doc) {
    const rss = doc.rss;
    const channel = rss.channel;
    if (!channel) throw new Error("No channel found in RSS feed");
    const channelTitle = this.textValue(channel.title);
    const channelDescription = this.textValue(channel.description);
    let md = "";
    if (channelTitle) md += `# ${channelTitle}
`;
    if (channelDescription) md += `${channelDescription}
`;
    const items = this.ensureArray(channel.item);
    for (const item of items) {
      const title = this.textValue(item.title);
      const description = this.textValue(item.description);
      const pubDate = this.textValue(item.pubDate);
      const content = this.textValue(item["content:encoded"]);
      if (title) md += `
## ${title}
`;
      if (pubDate) md += `Published on: ${pubDate}
`;
      if (description) md += await this.parseContent(description);
      if (content) md += await this.parseContent(content);
    }
    return { markdown: md, title: channelTitle ?? void 0 };
  }
  async parseAtom(doc) {
    const feed = doc.feed;
    const feedTitle = this.textValue(feed.title);
    const subtitle = this.textValue(feed.subtitle);
    let md = "";
    if (feedTitle) md += `# ${feedTitle}
`;
    if (subtitle) md += `${subtitle}
`;
    const entries = this.ensureArray(feed.entry);
    for (const entry of entries) {
      const title = this.textValue(entry.title);
      const summary = this.textValue(entry.summary);
      const updated = this.textValue(entry.updated);
      const content = this.textValue(entry.content);
      if (title) md += `
## ${title}
`;
      if (updated) md += `Updated on: ${updated}
`;
      if (summary) md += await this.parseContent(summary);
      if (content) md += await this.parseContent(content);
    }
    return { markdown: md, title: feedTitle ?? void 0 };
  }
  async parseContent(content) {
    try {
      const result = await this.htmlConverter.convertHtml(content);
      return result.markdown + "\n";
    } catch {
      return content + "\n";
    }
  }
  textValue(value) {
    if (value == null) return null;
    if (typeof value === "string") return value;
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    if (typeof value === "object" && "#text" in value) {
      return String(value["#text"]);
    }
    return null;
  }
  ensureArray(value) {
    if (value == null) return [];
    return Array.isArray(value) ? value : [value];
  }
};

// src/converters/xlsx.ts
var ACCEPTED_XLSX_EXTENSIONS = [".xlsx"];
var ACCEPTED_XLSX_MIMES = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
];
var ACCEPTED_XLS_EXTENSIONS = [".xls"];
var ACCEPTED_XLS_MIMES = [
  "application/vnd.ms-excel",
  "application/excel"
];
var XlsxConverter = class {
  accepts(info) {
    const ext = (info.extension ?? "").toLowerCase();
    const mime = (info.mimetype ?? "").toLowerCase();
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
  async convert(input, info, _opts) {
    const ext = (info.extension ?? "").toLowerCase();
    if (ACCEPTED_XLS_EXTENSIONS.includes(ext)) {
      throw new UnsupportedFormatError(".xls files are not supported. Convert to .xlsx first.");
    }
    let ExcelJS;
    try {
      ExcelJS = await import("exceljs");
    } catch {
      throw new MissingDependencyError("exceljs", "pnpm add exceljs");
    }
    const buffer = await input.buffer();
    const workbook = new ExcelJS.default.Workbook();
    await workbook.xlsx.load(buffer);
    let mdContent = "";
    workbook.eachSheet((worksheet) => {
      mdContent += `## ${worksheet.name}
`;
      const rows = [];
      let maxCols = 0;
      worksheet.eachRow((row) => {
        const cells = [];
        const colCount = row.cellCount;
        for (let col = 1; col <= colCount; col++) {
          const cell = row.getCell(col);
          if (cell.isMerged && cell.master !== cell) {
            cells.push("");
          } else {
            cells.push(this.formatCell(cell.value));
          }
        }
        rows.push(cells);
      });
      if (rows.length === 0) {
        mdContent += "\n";
        return;
      }
      for (const row of rows) {
        while (row.length > 0 && row[row.length - 1] === "") {
          row.pop();
        }
        if (row.length > maxCols) maxCols = row.length;
      }
      if (maxCols === 0) {
        mdContent += "\n";
        return;
      }
      for (const row of rows) {
        while (row.length < maxCols) {
          row.push("");
        }
      }
      const nonEmptyRows = rows.filter((row) => row.some((cell) => cell !== ""));
      if (nonEmptyRows.length === 0) {
        mdContent += "\n";
        return;
      }
      const header = nonEmptyRows[0];
      mdContent += "| " + header.join(" | ") + " |\n";
      mdContent += "| " + header.map(() => "---").join(" | ") + " |\n";
      for (let i = 1; i < nonEmptyRows.length; i++) {
        mdContent += "| " + nonEmptyRows[i].join(" | ") + " |\n";
      }
      const comments = [];
      worksheet.eachRow((row, rowNumber) => {
        row.eachCell((cell, colNumber) => {
          if (cell.isMerged && cell.master !== cell) return;
          if (cell.note) {
            const cellRef = `${String.fromCharCode(64 + colNumber)}${rowNumber}`;
            let text;
            if (typeof cell.note === "string") {
              text = cell.note;
            } else {
              text = (cell.note.texts || []).map((t) => t.text).join("");
            }
            if (text.trim()) {
              comments.push({ cell: cellRef, text: text.trim() });
            }
          }
        });
      });
      if (comments.length > 0) {
        mdContent += "\n### Comments\n";
        for (const c of comments) {
          mdContent += `- **${c.cell}**: ${c.text}
`;
        }
      }
      mdContent += "\n";
    });
    return { markdown: mdContent.trimEnd() };
  }
  formatCell(value) {
    if (value == null) return "";
    if (value instanceof Date) {
      return isNaN(value.getTime()) ? String(value) : value.toISOString();
    }
    if (typeof value === "object") {
      if ("richText" in value) {
        return value.richText.map((rt) => rt.text ?? "").join("");
      }
      if ("result" in value) {
        return this.formatCell(value.result);
      }
      if ("text" in value) {
        return String(value.text);
      }
      return String(value);
    }
    return String(value);
  }
};

// src/converters/pptx.ts
import { XMLParser as XMLParser2 } from "fast-xml-parser";
var ACCEPTED_EXTENSIONS4 = [".pptx"];
var ACCEPTED_MIME_PREFIXES2 = [
  "application/vnd.openxmlformats-officedocument.presentationml"
];
var CHART_REL_TYPE = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart";
var PptxConverter = class {
  htmlConverter = new HtmlConverter();
  parser = new XMLParser2(SAFE_XML_OPTIONS);
  accepts(info) {
    const ext = (info.extension ?? "").toLowerCase();
    const mime = (info.mimetype ?? "").toLowerCase();
    if (ACCEPTED_EXTENSIONS4.includes(ext)) return true;
    for (const prefix of ACCEPTED_MIME_PREFIXES2) {
      if (mime.startsWith(prefix)) return true;
    }
    return false;
  }
  async convert(input, _info, opts) {
    let JSZip;
    try {
      JSZip = await import("jszip");
    } catch {
      throw new MissingDependencyError("jszip", "pnpm add jszip");
    }
    const buffer = await input.buffer();
    const zip = await JSZip.default.loadAsync(buffer);
    const presXml = await this.readZipText(zip, "ppt/presentation.xml");
    if (!presXml) return null;
    const presDoc = this.parser.parse(presXml);
    const presRelsXml = await this.readZipText(zip, "ppt/_rels/presentation.xml.rels");
    if (!presRelsXml) return null;
    const presRelsDoc = this.parser.parse(presRelsXml);
    const relMap = /* @__PURE__ */ new Map();
    const rels = this.ensureArray(presRelsDoc?.Relationships?.Relationship);
    for (const rel of rels) {
      const id = rel["@_Id"];
      const target = rel["@_Target"];
      if (id && target) relMap.set(id, target);
    }
    const presentation = presDoc["p:presentation"] ?? presDoc.presentation ?? presDoc;
    const sldIdLst = presentation["p:sldIdLst"] ?? presentation.sldIdLst;
    const sldIds = this.ensureArray(sldIdLst?.["p:sldId"] ?? sldIdLst?.sldId);
    const slidePaths = [];
    for (const sld of sldIds) {
      const rId = sld["@_r:id"] ?? sld["@_rId"];
      if (rId && relMap.has(rId)) {
        const target = relMap.get(rId);
        const path = target.startsWith("slides/") ? `ppt/${target}` : target;
        slidePaths.push(path);
      }
    }
    const authorMap = /* @__PURE__ */ new Map();
    const authorsXml = await this.readZipText(zip, "ppt/commentAuthors.xml");
    if (authorsXml) {
      const authorsDoc = this.parser.parse(authorsXml);
      const authors = this.ensureArray(
        authorsDoc?.["p:cmAuthorLst"]?.["p:cmAuthor"] ?? authorsDoc?.cmAuthorLst?.cmAuthor
      );
      for (const a of authors) {
        authorMap.set(String(a["@_id"]), a["@_name"] ?? "Unknown");
      }
    }
    let mdContent = "";
    let slideNum = 0;
    for (const slidePath of slidePaths) {
      slideNum++;
      mdContent += `

<!-- Slide number: ${slideNum} -->
`;
      const slideXml = await this.readZipText(zip, slidePath);
      if (!slideXml) continue;
      const slideDoc = this.parser.parse(slideXml);
      const slideRelsPath = slidePath.replace("ppt/slides/", "ppt/slides/_rels/") + ".rels";
      const slideRelsMap = /* @__PURE__ */ new Map();
      const slideRelsXml = await this.readZipText(zip, slideRelsPath);
      if (slideRelsXml) {
        const slideRelsDoc = this.parser.parse(slideRelsXml);
        const slideRels = this.ensureArray(slideRelsDoc?.Relationships?.Relationship);
        for (const rel of slideRels) {
          slideRelsMap.set(rel["@_Id"], {
            type: rel["@_Type"] ?? "",
            target: rel["@_Target"] ?? ""
          });
        }
      }
      const sld = slideDoc["p:sld"] ?? slideDoc.sld ?? slideDoc;
      const cSld = sld["p:cSld"] ?? sld.cSld ?? sld;
      const spTree = cSld["p:spTree"] ?? cSld.spTree;
      if (!spTree) continue;
      const titleShapeId = this.findTitleShapeId(spTree);
      const shapes = this.collectShapes(spTree);
      const sortedShapes = this.sortShapesByPosition(shapes);
      for (const shape of sortedShapes) {
        mdContent += this.processShape(shape, titleShapeId, slideRelsMap, zip, opts);
      }
      const graphicFrames = this.collectGraphicFrames(spTree);
      for (const frame of graphicFrames) {
        mdContent += await this.processGraphicFrame(frame, slideRelsMap, zip, opts);
      }
      mdContent = mdContent.trimEnd();
      const notesPath = slidePath.replace("slides/slide", "notesSlides/notesSlide");
      const notesXml = await this.readZipText(zip, notesPath);
      if (notesXml) {
        const notesDoc = this.parser.parse(notesXml);
        const notesText = this.extractNotesText(notesDoc);
        if (notesText) {
          mdContent += `

### Notes:
${notesText}`;
        }
      }
      for (const [, rel] of slideRelsMap) {
        if (rel.type.includes("comments")) {
          const commentPath = rel.target.startsWith("../") ? "ppt/" + rel.target.slice(3) : rel.target.startsWith("ppt/") ? rel.target : "ppt/" + rel.target;
          const commentXml = await this.readZipText(zip, commentPath);
          if (commentXml) {
            const commentDoc = this.parser.parse(commentXml);
            const comments = this.ensureArray(
              commentDoc?.["p:cmLst"]?.["p:cm"] ?? commentDoc?.cmLst?.cm
            );
            if (comments.length > 0) {
              mdContent += "\n\n### Comments:\n";
              for (const cm of comments) {
                const authorId = String(cm["@_authorId"] ?? "");
                const author = authorMap.get(authorId) ?? "Unknown";
                const text = cm["p:text"] ?? cm.text ?? "";
                if (text) {
                  mdContent += `- **${author}**: ${text}
`;
                }
              }
            }
          }
        }
      }
    }
    return { markdown: mdContent.trimStart() };
  }
  processShape(shape, titleShapeId, slideRelsMap, zip, opts) {
    let md = "";
    if (shape._type === "pic") {
      const nvPicPr = shape["p:nvPicPr"] ?? shape.nvPicPr;
      const cNvPr = nvPicPr?.["p:cNvPr"] ?? nvPicPr?.cNvPr;
      let altText = cNvPr?.["@_descr"] ?? "";
      const shapeName = cNvPr?.["@_name"] ?? "image";
      altText = (altText || shapeName).replace(/[\r\n\[\]]/g, " ").replace(/\s+/g, " ").trim();
      if (opts.keepDataUris) {
        const filename = shapeName.replace(/\W/g, "") + ".jpg";
        md += `
![${altText}](${filename})
`;
      } else {
        const filename = shapeName.replace(/\W/g, "") + ".jpg";
        md += `
![${altText}](${filename})
`;
      }
      return md;
    }
    if (shape._type === "sp") {
      const nvSpPr = shape["p:nvSpPr"] ?? shape.nvSpPr;
      const cNvPr = nvSpPr?.["p:cNvPr"] ?? nvSpPr?.cNvPr;
      const shapeId = cNvPr?.["@_id"] ? String(cNvPr["@_id"]) : null;
      const txBody = shape["p:txBody"] ?? shape.txBody;
      if (txBody) {
        const text = this.extractTextFromTxBody(txBody);
        if (text) {
          if (shapeId && shapeId === titleShapeId) {
            md += "# " + text.trimStart() + "\n";
          } else {
            md += text + "\n";
          }
        }
      }
      return md;
    }
    if (shape._type === "grpSp") {
      const childShapes = this.collectShapesFromGroup(shape);
      const sorted = this.sortShapesByPosition(childShapes);
      for (const child of sorted) {
        md += this.processShape(child, titleShapeId, slideRelsMap, zip, opts);
      }
    }
    return md;
  }
  async processGraphicFrame(frame, slideRelsMap, zip, opts) {
    let md = "";
    const graphic = frame["a:graphic"] ?? frame.graphic;
    const graphicData = graphic?.["a:graphicData"] ?? graphic?.graphicData;
    if (graphicData) {
      const tbl = graphicData["a:tbl"] ?? graphicData.tbl;
      if (tbl) {
        md += await this.convertTable(tbl, opts);
      }
      const chartRef = graphicData["c:chart"] ?? graphicData.chart;
      if (chartRef) {
        const rId = chartRef["@_r:id"] ?? chartRef["@_rId"];
        if (rId && slideRelsMap.has(rId)) {
          const rel = slideRelsMap.get(rId);
          if (rel.type === CHART_REL_TYPE || rel.target.includes("chart")) {
            const chartPath = rel.target.startsWith("../") ? "ppt/" + rel.target.slice(3) : rel.target;
            const chartXml = await this.readZipText(zip, chartPath);
            if (chartXml) {
              md += this.parseChart(chartXml);
            }
          }
        }
      }
    }
    return md;
  }
  async convertTable(tbl, opts) {
    const rows = this.ensureArray(tbl["a:tr"] ?? tbl.tr);
    if (rows.length === 0) return "";
    let htmlTable = "<html><body><table>";
    let firstRow = true;
    for (const row of rows) {
      htmlTable += "<tr>";
      const cells = this.ensureArray(row["a:tc"] ?? row.tc);
      for (const cell of cells) {
        const text = this.extractTextFromTxBody(cell["a:txBody"] ?? cell.txBody);
        const escaped = this.escapeHtml(text);
        if (firstRow) {
          htmlTable += `<th>${escaped}</th>`;
        } else {
          htmlTable += `<td>${escaped}</td>`;
        }
      }
      htmlTable += "</tr>";
      firstRow = false;
    }
    htmlTable += "</table></body></html>";
    try {
      const result = await this.htmlConverter.convertHtml(htmlTable, opts.keepDataUris);
      return result.markdown.trim() + "\n";
    } catch {
      return "";
    }
  }
  parseChart(chartXml) {
    try {
      const doc = this.parser.parse(chartXml);
      const chartSpace = doc["c:chartSpace"] ?? doc.chartSpace ?? doc;
      const chart = chartSpace["c:chart"] ?? chartSpace.chart;
      if (!chart) return "\n\n[unsupported chart]\n\n";
      let md = "\n\n### Chart";
      const titleNode = chart["c:title"] ?? chart.title;
      if (titleNode) {
        const titleText = this.extractChartTitleText(titleNode);
        if (titleText) md += `: ${titleText}`;
      }
      md += "\n\n";
      const plotArea = chart["c:plotArea"] ?? chart.plotArea;
      if (!plotArea) return md + "[unsupported chart]\n\n";
      const chartTypes = ["barChart", "lineChart", "pieChart", "areaChart", "scatterChart", "radarChart", "doughnutChart"];
      let plotNode = null;
      for (const ct of chartTypes) {
        const nsKey = `c:${ct}`;
        if (plotArea[nsKey] ?? plotArea[ct]) {
          plotNode = plotArea[nsKey] ?? plotArea[ct];
          break;
        }
      }
      if (!plotNode) return md + "[unsupported chart]\n\n";
      const seriesList = this.ensureArray(plotNode["c:ser"] ?? plotNode.ser);
      if (seriesList.length === 0) return md + "[unsupported chart]\n\n";
      const firstSeries = seriesList[0];
      const catRef = firstSeries["c:cat"] ?? firstSeries.cat;
      const categoryNames = this.extractChartValues(catRef);
      const seriesNames = [];
      const seriesData = [];
      for (const ser of seriesList) {
        const tx = ser["c:tx"] ?? ser.tx;
        let serName = "Series";
        if (tx) {
          const strRef = tx["c:strRef"] ?? tx.strRef;
          if (strRef) {
            const cache = strRef["c:strCache"] ?? strRef.strCache;
            if (cache) {
              const pts = this.ensureArray(cache["c:pt"] ?? cache.pt);
              if (pts.length > 0) {
                serName = pts[0]["c:v"] ?? pts[0].v ?? "Series";
              }
            }
          }
        }
        seriesNames.push(String(serName));
        const valRef = ser["c:val"] ?? ser.val;
        seriesData.push(this.extractChartValues(valRef));
      }
      const headerRow = ["Category", ...seriesNames];
      const dataRows = [];
      for (let i = 0; i < categoryNames.length; i++) {
        const row = [String(categoryNames[i])];
        for (const series of seriesData) {
          row.push(String(series[i] ?? ""));
        }
        dataRows.push(row);
      }
      const rows = [headerRow, ...dataRows];
      const markdownTable = [];
      for (const row of rows) {
        markdownTable.push("| " + row.join(" | ") + " |");
      }
      const header = markdownTable[0];
      const separator = "|" + headerRow.map(() => "---").join("|") + "|";
      return md + [header, separator, ...markdownTable.slice(1)].join("\n");
    } catch {
      return "\n\n[unsupported chart]\n\n";
    }
  }
  extractChartTitleText(titleNode) {
    const tx = titleNode["c:tx"] ?? titleNode.tx;
    if (!tx) return "";
    const rich = tx["c:rich"] ?? tx.rich;
    if (!rich) return "";
    const paras = this.ensureArray(rich["a:p"] ?? rich.p);
    const parts = [];
    for (const p of paras) {
      const runs = this.ensureArray(p["a:r"] ?? p.r);
      for (const run of runs) {
        const t = run["a:t"] ?? run.t;
        if (t != null) parts.push(String(t));
      }
    }
    return parts.join("");
  }
  extractChartValues(ref) {
    if (!ref) return [];
    const numRef = ref["c:numRef"] ?? ref.numRef ?? ref;
    const numCache = numRef["c:numCache"] ?? numRef.numCache;
    if (numCache) {
      const pts = this.ensureArray(numCache["c:pt"] ?? numCache.pt);
      const values = [];
      for (const pt of pts) {
        const v = pt["c:v"] ?? pt.v;
        values.push(v != null ? isNaN(Number(v)) ? String(v) : Number(v) : "");
      }
      return values;
    }
    const strRef = ref["c:strRef"] ?? ref.strRef ?? ref;
    const strCache = strRef["c:strCache"] ?? strRef.strCache;
    if (strCache) {
      const pts = this.ensureArray(strCache["c:pt"] ?? strCache.pt);
      return pts.map((pt) => {
        const v = pt["c:v"] ?? pt.v;
        return v != null ? String(v) : "";
      });
    }
    return [];
  }
  findTitleShapeId(spTree) {
    const shapes = this.ensureArray(spTree["p:sp"] ?? spTree.sp);
    for (const sp of shapes) {
      const nvSpPr = sp["p:nvSpPr"] ?? sp.nvSpPr;
      if (!nvSpPr) continue;
      const nvPr = nvSpPr["p:nvPr"] ?? nvSpPr.nvPr;
      if (!nvPr) continue;
      const ph = nvPr["p:ph"] ?? nvPr.ph;
      if (!ph) continue;
      const phType = ph["@_type"];
      if (phType === "title" || phType === "ctrTitle") {
        const cNvPr = nvSpPr["p:cNvPr"] ?? nvSpPr.cNvPr;
        if (cNvPr?.["@_id"]) return String(cNvPr["@_id"]);
      }
    }
    return null;
  }
  collectShapes(spTree) {
    const shapes = [];
    const sps = this.ensureArray(spTree["p:sp"] ?? spTree.sp);
    for (const sp of sps) {
      shapes.push({ ...sp, _type: "sp" });
    }
    const pics = this.ensureArray(spTree["p:pic"] ?? spTree.pic);
    for (const pic of pics) {
      shapes.push({ ...pic, _type: "pic" });
    }
    const grps = this.ensureArray(spTree["p:grpSp"] ?? spTree.grpSp);
    for (const grp of grps) {
      shapes.push({ ...grp, _type: "grpSp" });
    }
    return shapes;
  }
  collectGraphicFrames(spTree) {
    return this.ensureArray(spTree["p:graphicFrame"] ?? spTree.graphicFrame);
  }
  collectShapesFromGroup(grpSp) {
    const shapes = [];
    const sps = this.ensureArray(grpSp["p:sp"] ?? grpSp.sp);
    for (const sp of sps) shapes.push({ ...sp, _type: "sp" });
    const pics = this.ensureArray(grpSp["p:pic"] ?? grpSp.pic);
    for (const pic of pics) shapes.push({ ...pic, _type: "pic" });
    const grps = this.ensureArray(grpSp["p:grpSp"] ?? grpSp.grpSp);
    for (const grp of grps) shapes.push({ ...grp, _type: "grpSp" });
    return shapes;
  }
  sortShapesByPosition(shapes) {
    return shapes.sort((a, b) => {
      const aPos = this.getPosition(a);
      const bPos = this.getPosition(b);
      if (aPos.top !== bPos.top) return aPos.top - bPos.top;
      return aPos.left - bPos.left;
    });
  }
  getPosition(shape) {
    const spPr = shape["p:spPr"] ?? shape.spPr;
    if (spPr) {
      const xfrm = spPr["a:xfrm"] ?? spPr.xfrm;
      if (xfrm) {
        const off = xfrm["a:off"] ?? xfrm.off;
        if (off) {
          return {
            top: Number(off["@_y"] ?? 0),
            left: Number(off["@_x"] ?? 0)
          };
        }
      }
    }
    const grpSpPr = shape["p:grpSpPr"] ?? shape.grpSpPr;
    if (grpSpPr) {
      const xfrm = grpSpPr["a:xfrm"] ?? grpSpPr.xfrm;
      if (xfrm) {
        const off = xfrm["a:off"] ?? xfrm.off;
        if (off) {
          return {
            top: Number(off["@_y"] ?? 0),
            left: Number(off["@_x"] ?? 0)
          };
        }
      }
    }
    return { top: -Infinity, left: -Infinity };
  }
  extractTextFromTxBody(txBody) {
    if (!txBody) return "";
    const paragraphs = this.ensureArray(txBody["a:p"] ?? txBody.p);
    const parts = [];
    for (const p of paragraphs) {
      const runs = this.ensureArray(p["a:r"] ?? p.r);
      const paraText = [];
      for (const run of runs) {
        const t = run["a:t"] ?? run.t;
        if (t != null) paraText.push(String(t));
      }
      parts.push(paraText.join(""));
    }
    return parts.join("\n");
  }
  extractNotesText(notesDoc) {
    const notesSld = notesDoc["p:notes"] ?? notesDoc.notes ?? notesDoc;
    const cSld = notesSld["p:cSld"] ?? notesSld.cSld;
    if (!cSld) return null;
    const spTree = cSld["p:spTree"] ?? cSld.spTree;
    if (!spTree) return null;
    const shapes = this.ensureArray(spTree["p:sp"] ?? spTree.sp);
    for (const sp of shapes) {
      const nvSpPr = sp["p:nvSpPr"] ?? sp.nvSpPr;
      if (!nvSpPr) continue;
      const nvPr = nvSpPr["p:nvPr"] ?? nvSpPr.nvPr;
      if (!nvPr) continue;
      const ph = nvPr["p:ph"] ?? nvPr.ph;
      if (!ph) continue;
      const phType = ph["@_type"];
      if (phType === "body") {
        const txBody = sp["p:txBody"] ?? sp.txBody;
        const text = this.extractTextFromTxBody(txBody);
        if (text.trim()) return text;
      }
    }
    return null;
  }
  async readZipText(zip, path) {
    const file = zip.file(path);
    if (!file) return null;
    return file.async("string");
  }
  escapeHtml(text) {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  ensureArray(value) {
    if (value == null) return [];
    return Array.isArray(value) ? value : [value];
  }
};

// src/converters/epub.ts
import { XMLParser as XMLParser3 } from "fast-xml-parser";
var ACCEPTED_EXTENSIONS5 = [".epub"];
var ACCEPTED_MIME_PREFIXES3 = [
  "application/epub",
  "application/epub+zip",
  "application/x-epub+zip"
];
var EpubConverter = class {
  htmlConverter = new HtmlConverter();
  parser = new XMLParser3(SAFE_XML_OPTIONS);
  accepts(info) {
    const ext = (info.extension ?? "").toLowerCase();
    const mime = (info.mimetype ?? "").toLowerCase();
    if (ACCEPTED_EXTENSIONS5.includes(ext)) return true;
    for (const prefix of ACCEPTED_MIME_PREFIXES3) {
      if (mime.startsWith(prefix)) return true;
    }
    return false;
  }
  async convert(input, _info, opts) {
    let JSZip;
    try {
      JSZip = await import("jszip");
    } catch {
      throw new MissingDependencyError("jszip", "pnpm add jszip");
    }
    const buffer = await input.buffer();
    const zip = await JSZip.default.loadAsync(buffer);
    const containerXml = await this.readZipText(zip, "META-INF/container.xml");
    if (!containerXml) return null;
    const containerDoc = this.parser.parse(containerXml);
    const container = containerDoc.container ?? containerDoc;
    const rootfiles = container.rootfiles ?? {};
    const rootfileNode = this.ensureArray(rootfiles.rootfile)[0];
    if (!rootfileNode) return null;
    const opfPath = rootfileNode["@_full-path"];
    if (!opfPath) return null;
    const opfXml = await this.readZipText(zip, opfPath);
    if (!opfXml) return null;
    const opfDoc = this.parser.parse(opfXml);
    const pkg = opfDoc.package ?? opfDoc;
    const metadata = pkg.metadata ?? {};
    const title = this.getTextValue(metadata["dc:title"]);
    const authors = this.getAllTextValues(metadata["dc:creator"]);
    const language = this.getTextValue(metadata["dc:language"]);
    const publisher = this.getTextValue(metadata["dc:publisher"]);
    const date = this.getTextValue(metadata["dc:date"]);
    const description = this.getTextValue(metadata["dc:description"]);
    const identifier = this.getTextValue(metadata["dc:identifier"]);
    const manifestItems = this.ensureArray(
      (pkg.manifest ?? {}).item
    );
    const manifest = /* @__PURE__ */ new Map();
    for (const item of manifestItems) {
      const id = item["@_id"] ?? item["@_href"];
      const href = item["@_href"];
      if (id && href) manifest.set(id, href);
    }
    const spineItems = this.ensureArray(
      (pkg.spine ?? {}).itemref
    );
    const spineOrder = spineItems.map((item) => item["@_idref"]);
    const basePath = opfPath.includes("/") ? opfPath.split("/").slice(0, -1).join("/") : "";
    const spinePaths = [];
    for (const idref of spineOrder) {
      if (!idref || !manifest.has(idref)) continue;
      const href = manifest.get(idref);
      const fullPath = basePath ? `${basePath}/${href}` : href;
      spinePaths.push(fullPath);
    }
    const markdownContent = [];
    let totalUncompressed = 0;
    for (const filePath of spinePaths) {
      const file = zip.file(filePath);
      if (!file) continue;
      const content = await file.async("string");
      totalUncompressed += content.length;
      if (totalUncompressed > opts.maxUncompressedSize) {
        break;
      }
      try {
        const result = await this.htmlConverter.convertHtml(content, opts.keepDataUris);
        markdownContent.push(result.markdown.trim());
      } catch {
      }
    }
    const metadataEntries = {
      title,
      authors,
      language,
      publisher,
      date,
      description,
      identifier
    };
    const metadataLines = [];
    for (const [key, value] of Object.entries(metadataEntries)) {
      let formatted = null;
      if (Array.isArray(value)) {
        const joined = value.join(", ");
        if (joined) formatted = joined;
      } else if (value) {
        formatted = value;
      }
      if (formatted) {
        metadataLines.push(`**${this.capitalize(key)}:** ${formatted}`);
      }
    }
    if (metadataLines.length > 0) {
      markdownContent.unshift(metadataLines.join("\n"));
    }
    return {
      markdown: markdownContent.join("\n\n"),
      title: title ?? void 0
    };
  }
  getTextValue(node) {
    if (node == null) return null;
    if (typeof node === "string") return node;
    if (typeof node === "number" || typeof node === "boolean") return String(node);
    if (typeof node === "object" && "#text" in node) {
      return String(node["#text"]);
    }
    if (Array.isArray(node)) {
      return this.getTextValue(node[0]);
    }
    return null;
  }
  getAllTextValues(node) {
    if (node == null) return [];
    const items = Array.isArray(node) ? node : [node];
    const values = [];
    for (const item of items) {
      const v = this.getTextValue(item);
      if (v) values.push(v);
    }
    return values;
  }
  capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
  async readZipText(zip, path) {
    const file = zip.file(path);
    if (!file) return null;
    return file.async("string");
  }
  ensureArray(value) {
    if (value == null) return [];
    return Array.isArray(value) ? value : [value];
  }
};

// src/converters/pdf.ts
var ACCEPTED_MIME_PREFIXES4 = ["application/pdf", "application/x-pdf"];
var ACCEPTED_EXTENSIONS6 = [".pdf"];
var PARTIAL_NUMBERING_PATTERN = /^\.\d+$/;
function mergePartialNumberingLines(text) {
  const lines = text.split("\n");
  const resultLines = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const stripped = line.trim();
    if (PARTIAL_NUMBERING_PATTERN.test(stripped)) {
      let j = i + 1;
      while (j < lines.length && !lines[j].trim()) {
        j++;
      }
      if (j < lines.length) {
        const nextLine = lines[j].trim();
        resultLines.push(`${stripped} ${nextLine}`);
        i = j + 1;
      } else {
        resultLines.push(line);
        i++;
      }
    } else {
      resultLines.push(line);
      i++;
    }
  }
  return resultLines.join("\n");
}
function extractFormContentFromWords(words, pageWidth) {
  if (words.length === 0) {
    return null;
  }
  const yTolerance = 5;
  const rowsByY = /* @__PURE__ */ new Map();
  for (const word of words) {
    const yKey = Math.round(word.y0 / yTolerance) * yTolerance;
    let row = rowsByY.get(yKey);
    if (!row) {
      row = [];
      rowsByY.set(yKey, row);
    }
    row.push(word);
  }
  const sortedYKeys = [...rowsByY.keys()].sort((a, b) => a - b);
  const rowInfo = [];
  for (const yKey of sortedYKeys) {
    const rowWords = [...rowsByY.get(yKey)].sort((a, b) => a.x0 - b.x0);
    if (rowWords.length === 0) continue;
    const firstX0 = rowWords[0].x0;
    const lastX1 = rowWords[rowWords.length - 1].x1;
    const lineWidth = lastX1 - firstX0;
    const combinedText = rowWords.map((w) => w.text).join(" ");
    const xPositions = rowWords.map((w) => w.x0);
    const xGroups = [];
    for (const x of [...xPositions].sort((a, b) => a - b)) {
      if (xGroups.length === 0 || x - xGroups[xGroups.length - 1] > 50) {
        xGroups.push(x);
      }
    }
    const isParagraph = lineWidth > pageWidth * 0.55 && combinedText.length > 60;
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
      isTableRow: false
      // Will be set below
    });
  }
  const allTableXPositions = [];
  for (const info of rowInfo) {
    if (info.numColumns >= 3 && !info.isParagraph) {
      allTableXPositions.push(...info.xGroups);
    }
  }
  if (allTableXPositions.length === 0) {
    return null;
  }
  allTableXPositions.sort((a, b) => a - b);
  const gaps = [];
  for (let i2 = 0; i2 < allTableXPositions.length - 1; i2++) {
    const gap = allTableXPositions[i2 + 1] - allTableXPositions[i2];
    if (gap > 5) {
      gaps.push(gap);
    }
  }
  let adaptiveTolerance;
  if (gaps.length >= 3) {
    const sortedGaps = [...gaps].sort((a, b) => a - b);
    const percentile70Idx = Math.floor(sortedGaps.length * 0.7);
    adaptiveTolerance = sortedGaps[percentile70Idx];
    adaptiveTolerance = Math.max(25, Math.min(50, adaptiveTolerance));
  } else {
    adaptiveTolerance = 35;
  }
  const globalColumns = [];
  for (const x of allTableXPositions) {
    if (globalColumns.length === 0 || x - globalColumns[globalColumns.length - 1] > adaptiveTolerance) {
      globalColumns.push(x);
    }
  }
  if (globalColumns.length > 1) {
    const contentWidth = globalColumns[globalColumns.length - 1] - globalColumns[0];
    const avgColWidth = contentWidth / globalColumns.length;
    if (avgColWidth < 30) {
      return null;
    }
    const columnsPerInch = globalColumns.length / (contentWidth / 72);
    if (columnsPerInch > 10) {
      return null;
    }
    const adaptiveMaxColumns = Math.max(15, Math.floor(20 * (pageWidth / 612)));
    if (globalColumns.length > adaptiveMaxColumns) {
      return null;
    }
  } else {
    return null;
  }
  const numCols = globalColumns.length;
  for (const info of rowInfo) {
    if (info.isParagraph) {
      info.isTableRow = false;
      continue;
    }
    if (info.hasPartialNumbering) {
      info.isTableRow = false;
      continue;
    }
    const alignedColumns = /* @__PURE__ */ new Set();
    for (const word of info.words) {
      const wordX = word.x0;
      for (let colIdx = 0; colIdx < globalColumns.length; colIdx++) {
        if (Math.abs(wordX - globalColumns[colIdx]) < 40) {
          alignedColumns.add(colIdx);
          break;
        }
      }
    }
    info.isTableRow = alignedColumns.size >= 2;
  }
  const tableRegions = [];
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
  const totalTableRows = tableRegions.reduce((sum, [start, end]) => sum + (end - start), 0);
  if (rowInfo.length > 0 && totalTableRows / rowInfo.length < 0.2) {
    return null;
  }
  function extractCells(info) {
    const cells = new Array(numCols).fill("");
    for (const word of info.words) {
      const wordX = word.x0;
      let assignedCol = numCols - 1;
      for (let colIdx = 0; colIdx < numCols - 1; colIdx++) {
        const colEnd = globalColumns[colIdx + 1];
        if (wordX < colEnd - 20) {
          assignedCol = colIdx;
          break;
        }
      }
      if (cells[assignedCol]) {
        cells[assignedCol] += " " + word.text;
      } else {
        cells[assignedCol] = word.text;
      }
    }
    return cells;
  }
  const resultLines = [];
  let idx = 0;
  while (idx < rowInfo.length) {
    const info = rowInfo[idx];
    let tableRegion = null;
    for (const [start, end] of tableRegions) {
      if (idx === start) {
        tableRegion = [start, end];
        break;
      }
    }
    if (tableRegion) {
      const [start, end] = tableRegion;
      const tableData = [];
      for (let tableIdx = start; tableIdx < end; tableIdx++) {
        const cells = extractCells(rowInfo[tableIdx]);
        tableData.push(cells);
      }
      if (tableData.length > 0) {
        const colWidths = [];
        for (let col = 0; col < numCols; col++) {
          let maxLen = 3;
          for (const row of tableData) {
            maxLen = Math.max(maxLen, row[col].length);
          }
          colWidths.push(maxLen);
        }
        const header = tableData[0];
        const headerStr = "| " + header.map((cell, i2) => cell.padEnd(colWidths[i2])).join(" | ") + " |";
        resultLines.push(headerStr);
        const separator = "| " + colWidths.map((w) => "-".repeat(w)).join(" | ") + " |";
        resultLines.push(separator);
        for (let r = 1; r < tableData.length; r++) {
          const row = tableData[r];
          const rowStr = "| " + row.map((cell, i2) => cell.padEnd(colWidths[i2])).join(" | ") + " |";
          resultLines.push(rowStr);
        }
      }
      idx = end;
    } else {
      let inTable = false;
      for (const [start, end] of tableRegions) {
        if (start < idx && idx < end) {
          inTable = true;
          break;
        }
      }
      if (!inTable) {
        resultLines.push(info.text);
      }
      idx++;
    }
  }
  return resultLines.join("\n");
}
function extractWords(items, pageHeight) {
  const words = [];
  for (const item of items) {
    const text = item.str.trim();
    if (!text) continue;
    const x = item.transform[4];
    const y = item.transform[5];
    const w = item.width;
    const h = item.height;
    const top = pageHeight - y;
    const bottom = top + Math.abs(h);
    const subWords = text.split(/\s+/);
    if (subWords.length === 1) {
      words.push({
        text,
        x0: x,
        y0: top,
        x1: x + w,
        y1: bottom
      });
    } else {
      const totalLen = subWords.reduce((sum, sw) => sum + sw.length, 0);
      let currentX = x;
      for (const sw of subWords) {
        const swWidth = sw.length / totalLen * w;
        words.push({
          text: sw,
          x0: currentX,
          y0: top,
          x1: currentX + swWidth,
          y1: bottom
        });
        currentX += swWidth + w / totalLen * 0.5;
      }
    }
  }
  return words;
}
function extractSimpleText(items, pageHeight) {
  const yTolerance = 3;
  const linesByY = /* @__PURE__ */ new Map();
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
  const sortedYKeys = [...linesByY.keys()].sort((a, b) => a - b);
  const lines = [];
  for (const yKey of sortedYKeys) {
    const lineItems = linesByY.get(yKey).sort((a, b) => a.x - b.x);
    const lineText = lineItems.map((li) => li.str).join("");
    if (lineText.trim()) {
      lines.push(lineText.trim());
    }
  }
  return lines.join("\n");
}
var COMMENT_ANNOTATION_TYPES = /* @__PURE__ */ new Set([1, 3, 9, 10, 11, 12]);
async function extractAnnotationComments(page) {
  const annotations = await page.getAnnotations({ intent: "any" });
  const pageComments = [];
  for (const annot of annotations) {
    if (!COMMENT_ANNOTATION_TYPES.has(annot.annotationType)) continue;
    const text = annot.contentsObj?.str ?? "";
    if (!text.trim()) continue;
    const author = annot.titleObj?.str ?? "";
    const subtype = annot.subtype ?? "Note";
    pageComments.push({ author, text: text.trim(), type: subtype });
  }
  if (pageComments.length === 0) return null;
  let commentSection = "\n\n### Comments\n";
  for (const c of pageComments) {
    if (c.author) {
      commentSection += `- **${c.author}** (${c.type}): ${c.text}
`;
    } else {
      commentSection += `- (${c.type}): ${c.text}
`;
    }
  }
  return commentSection.trimEnd();
}
var PdfConverter = class {
  accepts(info) {
    const ext = info.extension?.toLowerCase();
    if (ext && ACCEPTED_EXTENSIONS6.includes(ext)) return true;
    const mime = info.mimetype?.toLowerCase() ?? "";
    for (const prefix of ACCEPTED_MIME_PREFIXES4) {
      if (mime.startsWith(prefix)) return true;
    }
    return false;
  }
  async convert(input, _info, _opts) {
    let pdfjsLib;
    try {
      pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
    } catch {
      throw new MissingDependencyError("pdfjs-dist", "pnpm add pdfjs-dist");
    }
    let pdfjsBuildDir;
    try {
      const { dirname } = await import("path");
      try {
        const { fileURLToPath } = await import("url");
        pdfjsBuildDir = dirname(
          fileURLToPath(import.meta.resolve("pdfjs-dist/legacy/build/pdf.mjs"))
        );
      } catch {
        const { createRequire } = await import("module");
        const anchor = typeof import.meta.url === "string" && import.meta.url.startsWith("file:") ? import.meta.url : typeof __filename === "string" ? __filename : void 0;
        if (anchor) {
          const req = createRequire(anchor);
          pdfjsBuildDir = dirname(req.resolve("pdfjs-dist/legacy/build/pdf.mjs"));
        }
      }
    } catch {
    }
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      if (pdfjsBuildDir) {
        const { join } = await import("path");
        pdfjsLib.GlobalWorkerOptions.workerSrc = join(pdfjsBuildDir, "pdf.worker.mjs");
      } else {
        pdfjsLib.GlobalWorkerOptions.workerSrc = "pdf.worker.mjs";
      }
    }
    const buffer = await input.buffer();
    let standardFontDataUrl;
    if (pdfjsBuildDir) {
      const { join } = await import("path");
      standardFontDataUrl = join(pdfjsBuildDir, "..", "..", "standard_fonts/");
    }
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(buffer),
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: false,
      disableFontFace: true,
      ...standardFontDataUrl ? { standardFontDataUrl } : {}
    });
    const doc = await loadingTask.promise;
    try {
      const markdownChunks = [];
      let formPageCount = 0;
      for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
        const page = await doc.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1 });
        const pageHeight = viewport.height;
        const pageWidth = viewport.width;
        try {
          const textContent = await page.getTextContent();
          const textItems = textContent.items.filter(
            (item) => "str" in item
          );
          if (textItems.length > 0) {
            const words = extractWords(textItems, pageHeight);
            const formContent = extractFormContentFromWords(words, pageWidth);
            if (formContent !== null) {
              formPageCount++;
              if (formContent.trim()) {
                markdownChunks.push(formContent);
              }
            } else {
              const simpleText = extractSimpleText(textItems, pageHeight);
              if (simpleText.trim()) {
                markdownChunks.push(simpleText.trim());
              }
            }
          }
          const commentSection = await extractAnnotationComments(page);
          if (commentSection) {
            markdownChunks.push(commentSection);
          }
        } finally {
          page.cleanup();
        }
      }
      let markdown = markdownChunks.join("\n\n").trim();
      markdown = mergePartialNumberingLines(markdown);
      return { markdown };
    } finally {
      await doc.destroy();
    }
  }
};

// src/converters/image.ts
var ACCEPTED_EXTENSIONS7 = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".tiff", ".webp", ".svg"];
var ACCEPTED_MIME_PREFIXES5 = ["image/jpeg", "image/png", "image/gif", "image/bmp", "image/tiff", "image/webp", "image/svg"];
var METADATA_FIELDS = [
  "ImageSize",
  "Title",
  "Caption",
  "Description",
  "Keywords",
  "Artist",
  "Author",
  "DateTimeOriginal",
  "CreateDate",
  "GPSPosition"
];
var ImageConverter = class {
  accepts(info) {
    const ext = info.extension?.toLowerCase();
    if (ext && ACCEPTED_EXTENSIONS7.includes(ext)) return true;
    const mime = info.mimetype?.toLowerCase() ?? "";
    for (const prefix of ACCEPTED_MIME_PREFIXES5) {
      if (mime.startsWith(prefix)) return true;
    }
    return false;
  }
  async convert(input, info, opts) {
    const filename = info.filename ?? info.localPath ?? "image";
    let mdContent = `# Image: ${filename}
`;
    if (opts.nodeServices?.exiftool) {
      try {
        const metadata = await opts.nodeServices.exiftool(input, info);
        if (metadata && Object.keys(metadata).length > 0) {
          const metadataLines = [];
          for (const field of METADATA_FIELDS) {
            if (field in metadata) {
              metadataLines.push(`- **${field}:** ${metadata[field]}`);
            }
          }
          if (metadataLines.length > 0) {
            mdContent += "\n## Metadata\n\n" + metadataLines.join("\n") + "\n";
          }
        }
      } catch {
      }
    }
    if (opts.llmCaption) {
      try {
        const buffer = await input.buffer();
        const mimeType = info.mimetype ?? "application/octet-stream";
        const description = await opts.llmCaption(buffer, mimeType);
        if (description) {
          mdContent += "\n## Description\n\n" + description.trim() + "\n";
        }
      } catch {
      }
    }
    return { markdown: mdContent.trim() };
  }
};

// src/converters/audio.ts
var ACCEPTED_EXTENSIONS8 = [".mp3", ".wav", ".m4a", ".ogg", ".flac", ".aac", ".wma", ".mp4"];
var ACCEPTED_MIME_PREFIXES6 = ["audio/x-wav", "audio/mpeg", "audio/mp4", "audio/ogg", "audio/flac", "audio/aac", "video/mp4"];
var METADATA_FIELDS2 = [
  "Title",
  "Artist",
  "Author",
  "Band",
  "Album",
  "Genre",
  "Track",
  "DateTimeOriginal",
  "CreateDate",
  "NumChannels",
  "SampleRate",
  "AvgBytesPerSec",
  "BitsPerSample"
];
var AudioConverter = class {
  accepts(info) {
    const ext = info.extension?.toLowerCase();
    if (ext && ACCEPTED_EXTENSIONS8.includes(ext)) return true;
    const mime = info.mimetype?.toLowerCase() ?? "";
    for (const prefix of ACCEPTED_MIME_PREFIXES6) {
      if (mime.startsWith(prefix)) return true;
    }
    return false;
  }
  async convert(input, info, opts) {
    const filename = info.filename ?? info.localPath ?? "audio";
    let mdContent = `# Audio: ${filename}
`;
    if (opts.nodeServices?.exiftool) {
      try {
        const metadata = await opts.nodeServices.exiftool(input, info);
        if (metadata && Object.keys(metadata).length > 0) {
          const metadataLines = [];
          for (const field of METADATA_FIELDS2) {
            if (field in metadata) {
              metadataLines.push(`- **${field}:** ${metadata[field]}`);
            }
          }
          if (metadataLines.length > 0) {
            mdContent += "\n## Metadata\n\n" + metadataLines.join("\n") + "\n";
          }
        }
      } catch {
      }
    }
    if (opts.nodeServices?.transcribeAudio) {
      try {
        const transcript = await opts.nodeServices.transcribeAudio(input, info);
        if (transcript) {
          mdContent += "\n## Transcript\n\n" + transcript.trim() + "\n";
        }
      } catch {
      }
    }
    return { markdown: mdContent.trim() };
  }
};

// src/converters/outlook-msg.ts
var ACCEPTED_EXTENSIONS9 = [".msg"];
var ACCEPTED_MIME_PREFIXES7 = ["application/vnd.ms-outlook"];
var PROP_SUBJECT_UNICODE = "__substg1.0_0037001F";
var PROP_SUBJECT_ASCII = "__substg1.0_0037001E";
var PROP_FROM_UNICODE = "__substg1.0_0C1F001F";
var PROP_FROM_ASCII = "__substg1.0_0C1F001E";
var PROP_TO_UNICODE = "__substg1.0_0E04001F";
var PROP_TO_ASCII = "__substg1.0_0E04001E";
var PROP_BODY_UNICODE = "__substg1.0_1000001F";
var PROP_BODY_ASCII = "__substg1.0_1000001E";
var OutlookMsgConverter = class {
  accepts(info) {
    const ext = info.extension?.toLowerCase();
    if (ext && ACCEPTED_EXTENSIONS9.includes(ext)) return true;
    const mime = info.mimetype?.toLowerCase() ?? "";
    for (const prefix of ACCEPTED_MIME_PREFIXES7) {
      if (mime.startsWith(prefix)) return true;
    }
    return false;
  }
  async convert(input, _info, _opts) {
    let CFB;
    try {
      CFB = await import("cfb");
    } catch {
      throw new MissingDependencyError("cfb", "pnpm add cfb");
    }
    const buffer = await input.buffer();
    let container;
    try {
      container = CFB.parse(buffer);
    } catch {
      return null;
    }
    let mdContent = "# Email Message\n\n";
    const headers = {
      From: this.getStreamData(CFB, container, PROP_FROM_UNICODE, PROP_FROM_ASCII),
      To: this.getStreamData(CFB, container, PROP_TO_UNICODE, PROP_TO_ASCII),
      Subject: this.getStreamData(CFB, container, PROP_SUBJECT_UNICODE, PROP_SUBJECT_ASCII)
    };
    for (const [key, value] of Object.entries(headers)) {
      if (value) {
        mdContent += `**${key}:** ${value}
`;
      }
    }
    mdContent += "\n## Content\n\n";
    const body = this.getStreamData(CFB, container, PROP_BODY_UNICODE, PROP_BODY_ASCII);
    if (body) {
      mdContent += body;
    }
    return {
      markdown: mdContent.trim(),
      title: headers.Subject ?? void 0
    };
  }
  /**
   * Extract and decode stream data from the MSG file.
   * Tries the Unicode (UTF-16LE) stream first, then falls back to ASCII/UTF-8.
   */
  getStreamData(CFB, container, unicodePath, asciiPath) {
    const unicodeEntry = CFB.find(container, unicodePath);
    if (unicodeEntry?.content) {
      try {
        const data = unicodeEntry.content instanceof Uint8Array ? unicodeEntry.content : new Uint8Array(unicodeEntry.content);
        const text = new TextDecoder("utf-16le").decode(data).trim();
        return text.replace(/\0+$/, "");
      } catch {
      }
    }
    const asciiEntry = CFB.find(container, asciiPath);
    if (asciiEntry?.content) {
      try {
        const data = asciiEntry.content instanceof Uint8Array ? asciiEntry.content : new Uint8Array(asciiEntry.content);
        try {
          return new TextDecoder("utf-8").decode(data).trim();
        } catch {
          return new TextDecoder("utf-8", { fatal: false }).decode(data).trim();
        }
      } catch {
      }
    }
    return null;
  }
};

// src/converters/zip.ts
var ACCEPTED_EXTENSIONS10 = [".zip"];
var ACCEPTED_MIME_PREFIXES8 = ["application/zip"];
function sanitizeEntryName(name) {
  if (name.startsWith("/") || name.startsWith("\\")) return null;
  if (/^[A-Za-z]:[\\/]/.test(name)) return null;
  let sanitized = name;
  while (sanitized.startsWith("../") || sanitized.startsWith("..\\")) {
    sanitized = sanitized.slice(3);
  }
  if (sanitized.includes("../") || sanitized.includes("..\\")) return null;
  return sanitized;
}
function extractExtension2(filepath) {
  const basename = filepath.split("/").pop() ?? filepath;
  const dot = basename.lastIndexOf(".");
  if (dot === -1 || dot === basename.length - 1) return void 0;
  return basename.slice(dot).toLowerCase();
}
var ZipConverter = class {
  accepts(info) {
    const ext = info.extension?.toLowerCase();
    if (ext && ACCEPTED_EXTENSIONS10.includes(ext)) return true;
    const mime = info.mimetype?.toLowerCase() ?? "";
    for (const prefix of ACCEPTED_MIME_PREFIXES8) {
      if (mime.startsWith(prefix)) return true;
    }
    return false;
  }
  async convert(input, info, opts) {
    let JSZip;
    try {
      const mod = await import("jszip");
      JSZip = mod.default ?? mod;
    } catch {
      throw new MissingDependencyError("jszip", "pnpm add jszip");
    }
    const buffer = await input.buffer();
    const zip = await JSZip.loadAsync(buffer);
    const filePath = info.url ?? info.localPath ?? info.filename ?? "archive.zip";
    let mdContent = `Content from the zip file \`${filePath}\`:

`;
    let totalSize = 0;
    const fileEntries = [];
    zip.forEach((relativePath, zipEntry) => {
      if (!zipEntry.dir) {
        const sanitizedName = sanitizeEntryName(relativePath);
        if (sanitizedName) {
          fileEntries.push({ name: sanitizedName, entry: zipEntry });
        }
      }
    });
    for (const { name, entry } of fileEntries) {
      try {
        const fileBuffer = await entry.async("uint8array");
        totalSize += fileBuffer.length;
        if (totalSize > opts.maxUncompressedSize) {
          mdContent += `
## File: ${name}

*Skipped: total uncompressed size exceeds limit*

`;
          break;
        }
        if (opts.convertBuffer) {
          try {
            const ext = extractExtension2(name);
            const basename = name.split("/").pop() ?? name;
            const result = await opts.convertBuffer(fileBuffer, {
              streamInfo: {
                filename: basename,
                extension: ext
              }
            });
            mdContent += `## File: ${name}

`;
            mdContent += result.markdown + "\n\n";
          } catch {
          }
        }
      } catch {
      }
    }
    return { markdown: mdContent.trim() };
  }
};

// src/converters/doc-intel.ts
var ALL_FILE_TYPES = [
  "docx",
  "pptx",
  "xlsx",
  "pdf",
  "jpeg",
  "png",
  "bmp",
  "tiff"
];
function getMimePrefixes(types) {
  const prefixes = [];
  for (const t of types) {
    switch (t) {
      case "docx":
        prefixes.push("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
        break;
      case "pptx":
        prefixes.push("application/vnd.openxmlformats-officedocument.presentationml");
        break;
      case "xlsx":
        prefixes.push("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        break;
      case "html":
        prefixes.push("text/html", "application/xhtml+xml");
        break;
      case "pdf":
        prefixes.push("application/pdf", "application/x-pdf");
        break;
      case "jpeg":
        prefixes.push("image/jpeg");
        break;
      case "png":
        prefixes.push("image/png");
        break;
      case "bmp":
        prefixes.push("image/bmp");
        break;
      case "tiff":
        prefixes.push("image/tiff");
        break;
    }
  }
  return prefixes;
}
function getFileExtensions(types) {
  const exts = [];
  for (const t of types) {
    switch (t) {
      case "docx":
        exts.push(".docx");
        break;
      case "pptx":
        exts.push(".pptx");
        break;
      case "xlsx":
        exts.push(".xlsx");
        break;
      case "html":
        exts.push(".html");
        break;
      case "pdf":
        exts.push(".pdf");
        break;
      case "jpeg":
        exts.push(".jpg", ".jpeg");
        break;
      case "png":
        exts.push(".png");
        break;
      case "bmp":
        exts.push(".bmp");
        break;
      case "tiff":
        exts.push(".tiff");
        break;
    }
  }
  return exts;
}
var NO_OCR_TYPES = ["docx", "pptx", "xlsx", "html"];
var DocumentIntelligenceConverter = class {
  endpoint;
  credential;
  apiVersion;
  fileTypes;
  acceptedExtensions;
  acceptedMimePrefixes;
  constructor(options) {
    this.endpoint = options.endpoint;
    this.credential = options.credential;
    this.apiVersion = options.apiVersion ?? "2024-07-31-preview";
    this.fileTypes = options.fileTypes ?? ALL_FILE_TYPES;
    this.acceptedExtensions = getFileExtensions(this.fileTypes);
    this.acceptedMimePrefixes = getMimePrefixes(this.fileTypes);
  }
  accepts(info) {
    const ext = info.extension?.toLowerCase();
    if (ext && this.acceptedExtensions.includes(ext)) return true;
    const mime = info.mimetype?.toLowerCase() ?? "";
    for (const prefix of this.acceptedMimePrefixes) {
      if (mime.startsWith(prefix)) return true;
    }
    return false;
  }
  /**
   * Determine which analysis features are available for this file type.
   * Office file types (docx, pptx, xlsx, html) don't support OCR features.
   */
  needsOcr(info) {
    const ext = info.extension?.toLowerCase();
    const mime = info.mimetype?.toLowerCase() ?? "";
    const noOcrExtensions = getFileExtensions(NO_OCR_TYPES);
    const noOcrMimePrefixes = getMimePrefixes(NO_OCR_TYPES);
    if (ext && noOcrExtensions.includes(ext)) return false;
    for (const prefix of noOcrMimePrefixes) {
      if (mime.startsWith(prefix)) return false;
    }
    return true;
  }
  async convert(input, info, _opts) {
    let DocumentIntelligenceClient;
    let AzureKeyCredential;
    let DefaultAzureCredential;
    try {
      const diModule = await import("@azure-rest/ai-document-intelligence");
      DocumentIntelligenceClient = diModule.default ?? diModule;
    } catch {
      throw new MissingDependencyError(
        "@azure-rest/ai-document-intelligence",
        "pnpm add @azure-rest/ai-document-intelligence"
      );
    }
    let credential = this.credential;
    if (!credential) {
      const apiKey = typeof process !== "undefined" ? process.env.AZURE_API_KEY : void 0;
      if (apiKey) {
        try {
          const coreAuthModule = await Function('return import("@azure/core-auth")')();
          const AKC = coreAuthModule.AzureKeyCredential;
          credential = new AKC(apiKey);
        } catch {
          credential = { key: apiKey };
        }
      } else {
        try {
          const identityModule = await import("@azure/identity");
          DefaultAzureCredential = identityModule.DefaultAzureCredential;
          credential = new DefaultAzureCredential();
        } catch {
          throw new MissingDependencyError(
            "@azure/identity",
            "pnpm add @azure/identity"
          );
        }
      }
    }
    const client = DocumentIntelligenceClient(this.endpoint, credential, {
      apiVersion: this.apiVersion
    });
    const buffer = await input.buffer();
    const features = this.needsOcr(info) ? ["formulas", "ocrHighResolution", "styleFont"] : [];
    const initialResponse = await client.path("/documentModels/{modelId}:analyze", "prebuilt-layout").post({
      contentType: "application/octet-stream",
      body: buffer,
      queryParameters: {
        outputContentFormat: "markdown",
        ...features.length > 0 ? { features } : {}
      }
    });
    const poller = await client.getLongRunningPoller(initialResponse);
    const result = await poller.pollUntilDone();
    if (result.body?.analyzeResult?.content) {
      const markdown = result.body.analyzeResult.content.replace(/<!--[\s\S]*?-->/g, "");
      return { markdown };
    }
    return { markdown: "" };
  }
};

// src/markitdown.ts
var MarkItDown = class {
  registry = new ConverterRegistry();
  options;
  constructor(options = {}) {
    this.options = {
      ...options,
      maxBufferSize: options.maxBufferSize ?? DEFAULT_MAX_BUFFER_SIZE,
      maxUncompressedSize: options.maxUncompressedSize ?? DEFAULT_MAX_UNCOMPRESSED_SIZE
    };
    if (options.enableBuiltins !== false) {
      this.enableBuiltins();
    }
    if (options.plugins) {
      for (const plugin of options.plugins) {
        plugin.register(this, {});
      }
    }
  }
  registerConverter(converter, options) {
    this.registry.register(converter, options);
  }
  async convert(source, options) {
    if (source.startsWith("data:")) {
      const { mimetype, charset, data } = parseDataUri(source);
      return this.convertBuffer(data, {
        ...options,
        streamInfo: { mimetype, charset, ...options?.streamInfo }
      });
    }
    if (source.startsWith("file:")) {
      const { path } = fileUriToPath(source);
      const readFile2 = this.options.nodeServices?.readFile;
      if (!readFile2) {
        throw new Error("File path conversion requires nodeServices.readFile to be configured");
      }
      const buffer2 = await readFile2(path);
      const filename2 = path.split("/").pop();
      return this.convertBuffer(buffer2, {
        ...options,
        streamInfo: { filename: filename2, localPath: path, ...options?.streamInfo }
      });
    }
    if (source.startsWith("http:") || source.startsWith("https:")) {
      if (!options?.allowUrlFetch) {
        throw new Error(
          "URL fetching requires allowUrlFetch: true in options (SSRF protection). Use convertBuffer() for file uploads instead."
        );
      }
      const response = await fetch(source, {
        ...this.options.requestInit,
        headers: {
          Accept: "text/markdown, text/html;q=0.9, text/plain;q=0.8, */*;q=0.1",
          ...this.options.requestInit?.headers
        }
      });
      return this.convertResponse(response, {
        ...options,
        streamInfo: { url: source, ...options?.streamInfo }
      });
    }
    const readFile = this.options.nodeServices?.readFile;
    if (!readFile) {
      throw new Error("File path conversion requires nodeServices.readFile to be configured");
    }
    const buffer = await readFile(source);
    const filename = source.split("/").pop();
    return this.convertBuffer(buffer, {
      ...options,
      streamInfo: { filename, localPath: source, ...options?.streamInfo }
    });
  }
  async convertBuffer(buffer, options) {
    let info = buildStreamInfo(options?.streamInfo ?? {});
    if (!info.extension && !info.mimetype) {
      try {
        const { fileTypeFromBuffer } = await import("file-type");
        const detected = await fileTypeFromBuffer(buffer);
        if (detected) {
          info = buildStreamInfo({ ...info, mimetype: detected.mime, extension: "." + detected.ext });
        }
      } catch {
      }
    }
    const input = createConverterInputFromBuffer(buffer, this.options.maxBufferSize);
    return this.dispatch(input, info, options);
  }
  async convertStream(stream, options) {
    let webStream;
    if (stream instanceof ReadableStream) {
      webStream = stream;
    } else if (typeof stream.pipe === "function") {
      const nodeStream = stream;
      if (typeof nodeStream[Symbol.asyncIterator] === "function") {
        const iterable = nodeStream;
        webStream = new ReadableStream({
          async start(controller) {
            for await (const chunk of iterable) {
              controller.enqueue(chunk);
            }
            controller.close();
          }
        });
      } else {
        throw new Error("Unsupported stream type. Pass a Web ReadableStream or Node stream.Readable.");
      }
    } else {
      throw new Error("Unsupported stream type");
    }
    const info = buildStreamInfo(options?.streamInfo ?? {});
    const input = createConverterInputFromStream(webStream, this.options.maxBufferSize);
    return this.dispatch(input, info, options);
  }
  async convertResponse(response, options) {
    const contentType = response.headers.get("content-type") ?? "";
    const [mimeRaw, ...params] = contentType.split(";");
    const mimetype = mimeRaw.trim() || void 0;
    let charset;
    for (const param of params) {
      const [key, val] = param.split("=").map((s) => s.trim());
      if (key === "charset" && val) charset = val;
    }
    const disposition = response.headers.get("content-disposition") ?? "";
    let filename;
    const fnMatch = disposition.match(/filename[*]?=(?:UTF-8''|"?)([^";]+)/i);
    if (fnMatch) filename = decodeURIComponent(fnMatch[1]);
    const buffer = new Uint8Array(await response.arrayBuffer());
    return this.convertBuffer(buffer, {
      ...options,
      streamInfo: {
        mimetype,
        charset,
        filename,
        url: response.url || void 0,
        ...options?.streamInfo
      }
    });
  }
  buildLlmCaption() {
    if (this.options.llmCaption) return this.options.llmCaption;
    if (this.options.llmModel) {
      return async (buffer, mimeType) => {
        const { generateText } = await import("ai");
        const result = await generateText({
          model: this.options.llmModel,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: this.options.llmPrompt ?? "Write a detailed caption for this image."
                },
                {
                  type: "image",
                  image: buffer,
                  mimeType
                }
              ]
            }
          ]
        });
        return result.text;
      };
    }
    return void 0;
  }
  async dispatch(input, info, options) {
    const internalOpts = {
      keepDataUris: options?.keepDataUris ?? false,
      maxBufferSize: this.options.maxBufferSize,
      maxUncompressedSize: this.options.maxUncompressedSize,
      llmCaption: this.buildLlmCaption(),
      nodeServices: this.options.nodeServices ?? {},
      styleMap: this.options.styleMap,
      parentConverters: this.registry.getAll(),
      convertBuffer: (buf, opts) => this.convertBuffer(buf, opts)
    };
    const guesses = [info];
    if (info.extension || info.mimetype) {
      guesses.push({});
    }
    const failedAttempts = [];
    let anyAccepted = false;
    for (const guess of guesses) {
      const candidates = this.registry.findConverters(guess);
      for (const reg of candidates) {
        if (!reg.converter.accepts(guess)) continue;
        anyAccepted = true;
        try {
          const result = await reg.converter.convert(input, guess, internalOpts);
          if (result === null) continue;
          return {
            markdown: normalizeOutput(result.markdown),
            title: result.title
          };
        } catch (err) {
          failedAttempts.push({
            converter: reg.converter.constructor.name,
            error: err instanceof Error ? err : new Error(String(err))
          });
        }
      }
    }
    if (failedAttempts.length > 0) {
      throw new FileConversionError(failedAttempts);
    }
    const detail = info.extension ?? info.mimetype ?? info.filename ?? "unknown";
    throw new UnsupportedFormatError(detail);
  }
  enableBuiltins() {
    if (this.options.docintelEndpoint) {
      try {
        const fileTypes = this.options.docintelFileTypes;
        this.registerConverter(
          new DocumentIntelligenceConverter({
            endpoint: this.options.docintelEndpoint,
            credential: this.options.docintelCredential,
            apiVersion: this.options.docintelApiVersion,
            fileTypes
          }),
          {
            priority: PRIORITY_GENERIC,
            extensions: [".pdf", ".docx", ".pptx", ".xlsx", ".html", ".jpg", ".jpeg", ".png", ".bmp", ".tiff"],
            mimeTypes: ["application/pdf", "image/jpeg", "image/png", "image/bmp", "image/tiff"]
          }
        );
      } catch {
      }
    }
    this.registerConverter(new IpynbConverter(), {
      priority: PRIORITY_SPECIFIC,
      extensions: [".ipynb"],
      mimeTypes: ["application/x-ipynb+json"]
    });
    this.registerConverter(new CsvConverter(), {
      priority: PRIORITY_SPECIFIC,
      extensions: [".csv"],
      mimeTypes: ["text/csv", "application/csv"]
    });
    this.registerConverter(new DocxConverter(), {
      priority: PRIORITY_SPECIFIC,
      extensions: [".docx"],
      mimeTypes: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"]
    });
    this.registerConverter(new RssConverter(), {
      priority: PRIORITY_SPECIFIC,
      extensions: [".rss", ".atom", ".xml"],
      mimeTypes: ["application/rss+xml", "application/atom+xml", "text/xml", "application/xml"]
    });
    this.registerConverter(new XlsxConverter(), {
      priority: PRIORITY_SPECIFIC,
      extensions: [".xlsx", ".xls"],
      mimeTypes: [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
        "application/excel"
      ]
    });
    this.registerConverter(new PptxConverter(), {
      priority: PRIORITY_SPECIFIC,
      extensions: [".pptx"],
      mimeTypes: ["application/vnd.openxmlformats-officedocument.presentationml.presentation"]
    });
    this.registerConverter(new EpubConverter(), {
      priority: PRIORITY_SPECIFIC,
      extensions: [".epub"],
      mimeTypes: ["application/epub+zip", "application/epub", "application/x-epub+zip"]
    });
    this.registerConverter(new PdfConverter(), {
      priority: PRIORITY_SPECIFIC,
      extensions: [".pdf"],
      mimeTypes: ["application/pdf"]
    });
    this.registerConverter(new ImageConverter(), {
      priority: PRIORITY_SPECIFIC,
      extensions: [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".tiff", ".webp", ".svg"],
      mimeTypes: ["image/jpeg", "image/png", "image/gif", "image/bmp", "image/tiff", "image/webp", "image/svg"]
    });
    this.registerConverter(new AudioConverter(), {
      priority: PRIORITY_SPECIFIC,
      extensions: [".mp3", ".wav", ".m4a", ".ogg", ".flac", ".aac", ".wma", ".mp4"],
      mimeTypes: ["audio/x-wav", "audio/mpeg", "audio/mp4", "audio/ogg", "audio/flac", "audio/aac", "video/mp4"]
    });
    this.registerConverter(new OutlookMsgConverter(), {
      priority: PRIORITY_SPECIFIC,
      extensions: [".msg"],
      mimeTypes: ["application/vnd.ms-outlook"]
    });
    this.registerConverter(new ZipConverter(), {
      priority: PRIORITY_SPECIFIC,
      extensions: [".zip"],
      mimeTypes: ["application/zip"]
    });
    this.registerConverter(new PlainTextConverter(), {
      priority: PRIORITY_GENERIC,
      extensions: [".txt", ".text", ".md", ".markdown", ".json", ".jsonl"],
      mimeTypes: ["text/", "application/json", "application/markdown"]
    });
    this.registerConverter(new HtmlConverter(), {
      priority: PRIORITY_GENERIC,
      extensions: [".html", ".htm"],
      mimeTypes: ["text/html", "application/xhtml"]
    });
  }
};

// src/index.ts
var FileType = /* @__PURE__ */ ((FileType2) => {
  FileType2["PDF"] = "pdf";
  FileType2["DOCX"] = "docx";
  FileType2["XLSX"] = "xlsx";
  FileType2["XLS"] = "xls";
  FileType2["PPTX"] = "pptx";
  FileType2["HTML"] = "html";
  FileType2["CSV"] = "csv";
  FileType2["EPUB"] = "epub";
  FileType2["RSS"] = "rss";
  FileType2["ATOM"] = "atom";
  FileType2["XML"] = "xml";
  FileType2["IPYNB"] = "ipynb";
  FileType2["JSON"] = "json";
  FileType2["JSONL"] = "jsonl";
  FileType2["TXT"] = "txt";
  FileType2["MD"] = "md";
  FileType2["MSG"] = "msg";
  FileType2["ZIP"] = "zip";
  FileType2["JPG"] = "jpg";
  FileType2["JPEG"] = "jpeg";
  FileType2["PNG"] = "png";
  FileType2["GIF"] = "gif";
  FileType2["BMP"] = "bmp";
  FileType2["TIFF"] = "tiff";
  FileType2["WEBP"] = "webp";
  FileType2["SVG"] = "svg";
  FileType2["MP3"] = "mp3";
  FileType2["WAV"] = "wav";
  FileType2["M4A"] = "m4a";
  FileType2["OGG"] = "ogg";
  FileType2["FLAC"] = "flac";
  FileType2["AAC"] = "aac";
  FileType2["WMA"] = "wma";
  FileType2["MP4"] = "mp4";
  return FileType2;
})(FileType || {});
function isAxiosLike(source) {
  return typeof source === "object" && source !== null && "data" in source && "headers" in source && !(source instanceof Response);
}
function toBuffer(data) {
  if (data instanceof Uint8Array) return data;
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  if (typeof data === "string") return new TextEncoder().encode(data);
  throw new Error(
    'Axios response data must be an ArrayBuffer or Buffer. Set responseType: "arraybuffer" in your Axios request for binary files.'
  );
}
function extractAxiosInfo(res) {
  const buffer = toBuffer(res.data);
  const contentType = String(res.headers["content-type"] ?? "");
  const [mimeRaw, ...params] = contentType.split(";");
  const mimetype = mimeRaw.trim() || void 0;
  let charset;
  for (const param of params) {
    const [key, val] = param.split("=").map((s) => s.trim());
    if (key === "charset" && val) charset = val;
  }
  const disposition = String(res.headers["content-disposition"] ?? "");
  let filename;
  const fnMatch = disposition.match(/filename[*]?=(?:UTF-8''|"?)([^";]+)/i);
  if (fnMatch) filename = decodeURIComponent(fnMatch[1]);
  const url = res.config?.url;
  return { buffer, mimetype, charset, filename, url };
}
async function markitdown(source, options) {
  const {
    type,
    keepDataUris,
    allowUrlFetch,
    ...mdOptions
  } = options ?? {};
  const typeInfo = type ? { extension: "." + type } : {};
  const md = new MarkItDown(mdOptions);
  if (typeof source === "string") {
    return md.convert(source, { keepDataUris, allowUrlFetch, streamInfo: typeInfo });
  }
  if (source instanceof Response) {
    return md.convertResponse(source, { keepDataUris, allowUrlFetch, streamInfo: typeInfo });
  }
  if (isAxiosLike(source)) {
    const ax = extractAxiosInfo(source);
    return md.convertBuffer(ax.buffer, {
      keepDataUris,
      allowUrlFetch,
      streamInfo: {
        mimetype: ax.mimetype,
        charset: ax.charset,
        filename: ax.filename,
        url: ax.url,
        ...typeInfo
      }
    });
  }
  return md.convertBuffer(source, { keepDataUris, allowUrlFetch, streamInfo: typeInfo });
}
export {
  FileConversionError,
  FileTooLargeError,
  FileType,
  MarkItDown,
  MarkItDownError,
  MissingDependencyError,
  PRIORITY_GENERIC,
  PRIORITY_SPECIFIC,
  UnsupportedFormatError,
  markitdown
};
//# sourceMappingURL=index.js.map