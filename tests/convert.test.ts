// tests/convert.test.ts
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { MarkItDown } from '../src/markitdown.js';
import { GENERAL_TEST_VECTORS, DATA_URI_TEST_VECTORS } from './vectors.js';

const FIXTURES = resolve(import.meta.dirname, 'fixtures');

describe('PlainTextConverter', () => {
  it('converts .json file', async () => {
    const md = new MarkItDown();
    const buffer = readFileSync(resolve(FIXTURES, 'test.json'));
    const result = await md.convertBuffer(buffer, {
      streamInfo: { filename: 'test.json' },
    });
    expect(result.markdown).toContain('5b64c88c-b3c3-4510-bcb8-da0b200602d8');
    expect(result.markdown).toContain('9700dc99-6685-40b4-9a3a-5e406dcb37f3');
  });
});

describe('IpynbConverter', () => {
  it('converts Jupyter notebook', async () => {
    const md = new MarkItDown();
    const buffer = readFileSync(resolve(FIXTURES, 'test_notebook.ipynb'));
    const result = await md.convertBuffer(buffer, {
      streamInfo: { filename: 'test_notebook.ipynb' },
    });
    expect(result.markdown).toContain('# Test Notebook');
    expect(result.markdown).toContain('```python');
    expect(result.markdown).toContain('print("markitdown")');
    expect(result.markdown).not.toContain('nbformat');
    expect(result.markdown).not.toContain('nbformat_minor');
  });
});

describe('CsvConverter', () => {
  it('converts CSV with Japanese encoding', async () => {
    const md = new MarkItDown();
    const buffer = readFileSync(resolve(FIXTURES, 'test_mskanji.csv'));
    const result = await md.convertBuffer(buffer, {
      streamInfo: { filename: 'test_mskanji.csv', charset: 'cp932' },
    });
    expect(result.markdown).toContain('| 名前 | 年齢 | 住所 |');
    expect(result.markdown).toContain('| --- | --- | --- |');
    expect(result.markdown).toContain('| 佐藤太郎 | 30 | 東京 |');
  });
});

describe('DocxConverter', () => {
  it('converts DOCX file', async () => {
    const md = new MarkItDown();
    const buffer = readFileSync(resolve(FIXTURES, 'test.docx'));
    const result = await md.convertBuffer(buffer, {
      streamInfo: { filename: 'test.docx' },
    });
    expect(result.markdown).toContain('314b0a30-5b04-470b-b9f7-eed2c2bec74a');
    expect(result.markdown).toContain('# Abstract');
    expect(result.markdown).toContain('# Introduction');
    expect(result.markdown).toContain('AutoGen: Enabling Next-Gen LLM Applications via Multi-Agent Conversation');
  });
});

describe('EpubConverter', () => {
  it('converts EPUB file', async () => {
    const md = new MarkItDown();
    const buffer = readFileSync(resolve(FIXTURES, 'test.epub'));
    const result = await md.convertBuffer(buffer, {
      streamInfo: { filename: 'test.epub' },
    });
    expect(result.markdown).toContain('Test Author');
    expect(result.markdown).toContain('# Chapter 1');
    expect(result.markdown).toContain('This is a **test** paragraph');
    expect(result.markdown).toContain('> This is a blockquote for testing');
  });
});

describe('PptxConverter', () => {
  it('converts PPTX file', async () => {
    const md = new MarkItDown();
    const buffer = readFileSync(resolve(FIXTURES, 'test.pptx'));
    const result = await md.convertBuffer(buffer, {
      streamInfo: { filename: 'test.pptx' },
    });
    expect(result.markdown).toContain('2cdda5c8-e50e-4db4-b5f0-9722a649f455');
    expect(result.markdown).toContain('04191ea8-5c73-4215-a1d3-1cfb43aaaf12');
    expect(result.markdown).toContain('44bf7d06-5e7a-4a40-a2e1-a2e42ef28c8a');
    expect(result.markdown).toContain('AutoGen: Enabling Next-Gen LLM Applications via Multi-Agent Conversation');
  });
});

describe('PptxConverter comments', () => {
  it('extracts slide comments', async () => {
    // Create a minimal PPTX with comments using JSZip
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();

    // Minimal [Content_Types].xml
    zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  <Override PartName="/ppt/slides/slide1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
  <Override PartName="/ppt/comments/comment1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.comments+xml"/>
  <Override PartName="/ppt/commentAuthors.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.commentAuthors+xml"/>
</Types>`);

    // _rels/.rels
    zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
</Relationships>`);

    // ppt/presentation.xml
    zip.file('ppt/presentation.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:sldIdLst><p:sldId id="256" r:id="rId2"/></p:sldIdLst>
</p:presentation>`);

    // ppt/_rels/presentation.xml.rels
    zip.file('ppt/_rels/presentation.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide1.xml"/>
</Relationships>`);

    // ppt/slides/slide1.xml
    zip.file('ppt/slides/slide1.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
  xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <p:cSld><p:spTree>
    <p:sp><p:nvSpPr><p:cNvPr id="1" name="Title"/><p:cNvSpPr/><p:nvPr><p:ph type="title"/></p:nvPr></p:nvSpPr>
      <p:spPr><a:xfrm><a:off x="0" y="0"/></a:xfrm></p:spPr>
      <p:txBody><a:p><a:r><a:t>Test Slide</a:t></a:r></a:p></p:txBody>
    </p:sp>
  </p:spTree></p:cSld>
</p:sld>`);

    // ppt/slides/_rels/slide1.xml.rels - link to comment file
    zip.file('ppt/slides/_rels/slide1.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments" Target="../comments/comment1.xml"/>
</Relationships>`);

    // ppt/commentAuthors.xml
    zip.file('ppt/commentAuthors.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:cmAuthorLst xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cmAuthor id="0" name="Jane Reviewer" initials="JR" lastIdx="1" clrIdx="0"/>
</p:cmAuthorLst>`);

    // ppt/comments/comment1.xml
    zip.file('ppt/comments/comment1.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:cmLst xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cm authorId="0" dt="2024-01-15T10:00:00" idx="1">
    <p:pos x="100" y="200"/>
    <p:text>This slide needs more detail - pptx-comment-test-abc123</p:text>
  </p:cm>
</p:cmLst>`);

    const buffer = await zip.generateAsync({ type: 'uint8array' });
    const md = new MarkItDown();
    const result = await md.convertBuffer(buffer, {
      streamInfo: { filename: 'test_comments.pptx' },
    });
    expect(result.markdown).toContain('pptx-comment-test-abc123');
    expect(result.markdown).toContain('Jane Reviewer');
  });
});

describe('XlsxConverter', () => {
  it('converts XLSX file', async () => {
    const md = new MarkItDown();
    const buffer = readFileSync(resolve(FIXTURES, 'test.xlsx'));
    const result = await md.convertBuffer(buffer, {
      streamInfo: { filename: 'test.xlsx' },
    });
    expect(result.markdown).toContain('09060124-b5e7-4717-9d07-3c046eb');
    expect(result.markdown).toContain('6ff4173b-42a5-4784-9b19-f49caff4d93d');
    expect(result.markdown).toContain('affc7dad-52dc-4b98-9b5d-51e65d8a8ad0');
  });

  it('throws UnsupportedFormatError for .xls', async () => {
    const md = new MarkItDown();
    const buffer = readFileSync(resolve(FIXTURES, 'test.xls'));
    await expect(
      md.convertBuffer(buffer, { streamInfo: { filename: 'test.xls' } }),
    ).rejects.toThrow('Conversion failed');
  });
});

describe('XlsxConverter comments', () => {
  it('extracts cell comments/notes', async () => {
    // Create an XLSX with comments programmatically using ExcelJS
    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.default.Workbook();
    const sheet = workbook.addWorksheet('Sheet1');
    sheet.addRow(['Name', 'Value']);
    sheet.addRow(['Alpha', '100']);
    // Add a comment to cell B2
    sheet.getCell('B2').note = 'This value needs review - markitdown-comment-test';

    const buffer = await workbook.xlsx.writeBuffer();
    const md = new MarkItDown();
    const result = await md.convertBuffer(new Uint8Array(buffer as ArrayBuffer), {
      streamInfo: { filename: 'test_comments.xlsx' },
    });
    expect(result.markdown).toContain('markitdown-comment-test');
    expect(result.markdown).toContain('B2');
  });
});

describe('RssConverter', () => {
  it('converts RSS feed', async () => {
    const md = new MarkItDown();
    const buffer = readFileSync(resolve(FIXTURES, 'test_rss.xml'));
    const result = await md.convertBuffer(buffer, {
      streamInfo: { filename: 'test_rss.xml', mimetype: 'text/xml' },
    });
    expect(result.markdown).toContain('# The Official Microsoft Blog');
    expect(result.markdown).toContain('## Ignite 2024');
    expect(result.markdown).not.toContain('<rss');
    expect(result.markdown).not.toContain('<feed');
  });
});

describe('PdfConverter', () => {
  it('converts PDF file', async () => {
    const md = new MarkItDown();
    const buffer = readFileSync(resolve(FIXTURES, 'test.pdf'));
    const result = await md.convertBuffer(buffer, {
      streamInfo: { filename: 'test.pdf' },
    });
    expect(result.markdown).toContain('While there is contemporaneous exploration of multi-agent approaches');
  });
});

describe('HtmlConverter', () => {
  it('converts HTML blog page', async () => {
    const md = new MarkItDown();
    const buffer = readFileSync(resolve(FIXTURES, 'test_blog.html'));
    const result = await md.convertBuffer(buffer, {
      streamInfo: { filename: 'test_blog.html', mimetype: 'text/html', charset: 'utf-8' },
    });
    expect(result.markdown).toContain('Large language models (LLMs) are powerful tools');
    expect(result.markdown).toContain('an example where high cost can easily prevent a generic complex');
  });
});

describe('ImageConverter', () => {
  it('converts image with basic metadata', async () => {
    const md = new MarkItDown();
    const buffer = readFileSync(resolve(FIXTURES, 'test.jpg'));
    const result = await md.convertBuffer(buffer, {
      streamInfo: { filename: 'test.jpg' },
    });
    expect(result.markdown).toContain('test.jpg');
  });
});

describe('AudioConverter', () => {
  it('converts audio file with minimal output', async () => {
    const md = new MarkItDown();
    const buffer = new Uint8Array(100); // dummy audio
    const result = await md.convertBuffer(buffer, {
      streamInfo: { filename: 'test.mp3', mimetype: 'audio/mpeg' },
    });
    expect(result.markdown).toContain('test.mp3');
  });
});

describe('OutlookMsgConverter', () => {
  it('converts MSG file', async () => {
    const md = new MarkItDown();
    const buffer = readFileSync(resolve(FIXTURES, 'test_outlook_msg.msg'));
    const result = await md.convertBuffer(buffer, {
      streamInfo: { filename: 'test_outlook_msg.msg' },
    });
    expect(result.markdown).toContain('# Email Message');
    expect(result.markdown).toContain('test.sender@example.com');
    expect(result.markdown).toContain('test.recipient@example.com');
    expect(result.markdown).toContain('Test Email Message');
  });
});

describe('ZipConverter', () => {
  it('converts ZIP with nested documents', async () => {
    const md = new MarkItDown();
    const buffer = readFileSync(resolve(FIXTURES, 'test_files.zip'));
    const result = await md.convertBuffer(buffer, {
      streamInfo: { filename: 'test_files.zip' },
    });
    // Should contain content from nested DOCX
    expect(result.markdown).toContain('314b0a30-5b04-470b-b9f7-eed2c2bec74a');
    // Should contain content from nested XLSX
    expect(result.markdown).toContain('09060124-b5e7-4717-9d07-3c046eb');
  });
});

// ------------------------------------------------------------------
// Vector-based parametrized tests
// ------------------------------------------------------------------

describe('Vector-based conversion tests', () => {
  for (const vector of GENERAL_TEST_VECTORS) {
    it(`converts ${vector.filename}`, async () => {
      const fixturePath = resolve(FIXTURES, vector.filename);
      if (!existsSync(fixturePath)) {
        return; // skip if fixture doesn't exist
      }

      const md = new MarkItDown();
      const buffer = readFileSync(fixturePath);
      const result = await md.convertBuffer(buffer, {
        streamInfo: {
          filename: vector.filename,
          mimetype: vector.mimetype,
          charset: vector.charset,
        },
      });

      for (const expected of vector.mustInclude) {
        expect(result.markdown).toContain(expected);
      }
      for (const unexpected of vector.mustNotInclude) {
        expect(result.markdown).not.toContain(unexpected);
      }
    });
  }
});

describe('Data URI conversion tests', () => {
  for (const vector of DATA_URI_TEST_VECTORS) {
    it(`converts ${vector.filename} with keepDataUris`, async () => {
      const fixturePath = resolve(FIXTURES, vector.filename);
      if (!existsSync(fixturePath)) {
        return; // skip if fixture doesn't exist
      }

      const md = new MarkItDown();
      const buffer = readFileSync(fixturePath);
      const result = await md.convertBuffer(buffer, {
        streamInfo: {
          filename: vector.filename,
          mimetype: vector.mimetype,
          charset: vector.charset,
        },
        keepDataUris: true,
      });

      for (const expected of vector.mustInclude) {
        expect(result.markdown).toContain(expected);
      }
      for (const unexpected of vector.mustNotInclude) {
        expect(result.markdown).not.toContain(unexpected);
      }
    });
  }
});

// ------------------------------------------------------------------
// Input method tests
// ------------------------------------------------------------------

describe('Input methods', () => {
  it('convertStream works with Web ReadableStream', async () => {
    const md = new MarkItDown();
    const buffer = readFileSync(resolve(FIXTURES, 'test.json'));
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(buffer));
        controller.close();
      },
    });
    const result = await md.convertStream(stream, {
      streamInfo: { filename: 'test.json' },
    });
    expect(result.markdown).toContain('5b64c88c-b3c3-4510-bcb8-da0b200602d8');
  });

  it('convertBuffer works with TextEncoder output', async () => {
    const md = new MarkItDown();
    const buffer = new TextEncoder().encode('plain text content');
    const result = await md.convertBuffer(buffer, {
      streamInfo: { filename: 'test.txt' },
    });
    expect(result.markdown).toContain('plain text content');
  });

  it('convert rejects non-URL string without nodeServices', async () => {
    const md = new MarkItDown();
    await expect(
      md.convert('/some/local/file.pdf'),
    ).rejects.toThrow('nodeServices.readFile');
  });
});
