// tests/markitdown-fn.test.ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { markitdown, FileType } from '../src/index.js';

const FIXTURES = resolve(import.meta.dirname, 'fixtures');

describe('markitdown() convenience function', () => {
  describe('buffer input', () => {
    it('converts a buffer with FileType enum', async () => {
      const buffer = readFileSync(resolve(FIXTURES, 'test.json'));
      const result = await markitdown(buffer, { type: FileType.JSON });
      expect(result.markdown).toContain('5b64c88c-b3c3-4510-bcb8-da0b200602d8');
    });

    it('converts a buffer with string type', async () => {
      const buffer = readFileSync(resolve(FIXTURES, 'test.json'));
      const result = await markitdown(buffer, { type: 'json' });
      expect(result.markdown).toContain('5b64c88c-b3c3-4510-bcb8-da0b200602d8');
    });

    it('converts a buffer with no type hint via magic byte detection', async () => {
      const buffer = readFileSync(resolve(FIXTURES, 'test.pdf'));
      const result = await markitdown(buffer);
      expect(result.markdown.length).toBeGreaterThan(0);
    });
  });

  describe('data URI input', () => {
    it('converts a data URI string', async () => {
      const content = '# Hello World';
      const encoded = Buffer.from(content).toString('base64');
      const dataUri = `data:text/plain;base64,${encoded}`;
      const result = await markitdown(dataUri);
      expect(result.markdown).toContain('Hello World');
    });
  });

  describe('Axios-like response input', () => {
    it('converts an Axios response with ArrayBuffer data', async () => {
      const buffer = readFileSync(resolve(FIXTURES, 'test.json'));
      const axiosResponse = {
        data: buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
        headers: {
          'content-type': 'application/json',
          'content-disposition': 'attachment; filename="test.json"',
        },
        config: { url: 'https://example.com/test.json' },
      };
      const result = await markitdown(axiosResponse);
      expect(result.markdown).toContain('5b64c88c-b3c3-4510-bcb8-da0b200602d8');
    });

    it('converts an Axios response with Buffer data', async () => {
      const buffer = readFileSync(resolve(FIXTURES, 'test.json'));
      const axiosResponse = {
        data: buffer,
        headers: {
          'content-type': 'application/json',
        },
      };
      const result = await markitdown(axiosResponse);
      expect(result.markdown).toContain('5b64c88c-b3c3-4510-bcb8-da0b200602d8');
    });

    it('converts an Axios response with string data (text formats)', async () => {
      const html = '<html><body><h1>Hello</h1><p>World</p></body></html>';
      const axiosResponse = {
        data: html,
        headers: {
          'content-type': 'text/html; charset=utf-8',
        },
      };
      const result = await markitdown(axiosResponse);
      expect(result.markdown).toContain('Hello');
      expect(result.markdown).toContain('World');
    });

    it('extracts charset from content-type header', async () => {
      const csv = '名前,年齢\n太郎,30';
      const axiosResponse = {
        data: csv,
        headers: {
          'content-type': 'text/csv; charset=utf-8',
          'content-disposition': 'attachment; filename="data.csv"',
        },
      };
      const result = await markitdown(axiosResponse);
      expect(result.markdown).toContain('名前');
      expect(result.markdown).toContain('太郎');
    });

    it('throws clear error for unsupported data types', async () => {
      const axiosResponse = {
        data: { some: 'object' },
        headers: { 'content-type': 'application/json' },
      };
      await expect(markitdown(axiosResponse as any)).rejects.toThrow(
        'Set responseType: "arraybuffer"',
      );
    });

    it('type option overrides Axios header detection', async () => {
      const buffer = readFileSync(resolve(FIXTURES, 'test.json'));
      const axiosResponse = {
        data: buffer,
        headers: {},
      };
      const result = await markitdown(axiosResponse, { type: FileType.JSON });
      expect(result.markdown).toContain('5b64c88c-b3c3-4510-bcb8-da0b200602d8');
    });
  });

  describe('options passthrough', () => {
    it('passes MarkItDownOptions through to the instance', async () => {
      const buffer = readFileSync(resolve(FIXTURES, 'test.json'));
      // maxBufferSize is a MarkItDownOptions field -- verify it's respected
      await expect(
        markitdown(buffer, { type: 'json', maxBufferSize: 10 }),
      ).rejects.toThrow();
    });
  });
});
