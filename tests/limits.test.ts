import { describe, it, expect } from 'vitest';
import { MarkItDown } from '../src/markitdown.js';

describe('Buffer size limits', () => {
  it('throws FileTooLargeError when buffer exceeds maxBufferSize', async () => {
    const md = new MarkItDown({ maxBufferSize: 100 });
    const bigBuffer = new Uint8Array(200);
    await expect(
      md.convertBuffer(bigBuffer, { streamInfo: { filename: 'test.txt' } }),
    ).rejects.toThrow('File too large');
  });

  it('accepts buffer within maxBufferSize', async () => {
    const md = new MarkItDown({ maxBufferSize: 1000 });
    const smallBuffer = new TextEncoder().encode('hello world');
    const result = await md.convertBuffer(smallBuffer, {
      streamInfo: { filename: 'test.txt' },
    });
    expect(result.markdown).toContain('hello world');
  });

  it('throws FileTooLargeError at exact boundary', async () => {
    const md = new MarkItDown({ maxBufferSize: 100 });
    const exactBuffer = new Uint8Array(101);
    await expect(
      md.convertBuffer(exactBuffer, { streamInfo: { filename: 'test.txt' } }),
    ).rejects.toThrow('File too large');
  });

  it('accepts buffer at exact maxBufferSize', async () => {
    const md = new MarkItDown({ maxBufferSize: 100 });
    const buffer = new TextEncoder().encode('x'.repeat(100));
    const result = await md.convertBuffer(buffer, {
      streamInfo: { filename: 'test.txt' },
    });
    expect(result.markdown).toContain('x');
  });
});

describe('Stream size limits', () => {
  it('rejects stream exceeding maxBufferSize', async () => {
    const md = new MarkItDown({ maxBufferSize: 100 });
    const bigChunk = new Uint8Array(200);
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(bigChunk);
        controller.close();
      },
    });
    // The stream size check is lazy (triggered when converter reads the buffer),
    // so the FileTooLargeError is caught by dispatch and wrapped in FileConversionError.
    await expect(
      md.convertStream(stream, { streamInfo: { filename: 'test.txt' } }),
    ).rejects.toThrow();
  });

  it('rejects stream when multiple chunks exceed maxBufferSize', async () => {
    const md = new MarkItDown({ maxBufferSize: 100 });
    const chunk = new Uint8Array(60);
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(chunk);
        controller.enqueue(chunk); // 120 total > 100
        controller.close();
      },
    });
    await expect(
      md.convertStream(stream, { streamInfo: { filename: 'test.txt' } }),
    ).rejects.toThrow();
  });

  it('accepts stream within maxBufferSize', async () => {
    const md = new MarkItDown({ maxBufferSize: 1000 });
    const data = new TextEncoder().encode('stream content');
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(data);
        controller.close();
      },
    });
    const result = await md.convertStream(stream, {
      streamInfo: { filename: 'test.txt' },
    });
    expect(result.markdown).toContain('stream content');
  });
});

describe('Default limits', () => {
  it('uses default maxBufferSize when not specified', async () => {
    const md = new MarkItDown();
    // Small buffer should always work with defaults
    const buffer = new TextEncoder().encode('test');
    const result = await md.convertBuffer(buffer, {
      streamInfo: { filename: 'test.txt' },
    });
    expect(result.markdown).toContain('test');
  });
});
