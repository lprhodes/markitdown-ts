// tests/convert.test.ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { MarkItDown } from '../src/markitdown.js';

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
