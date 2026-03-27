// tests/converter-input.test.ts
import { describe, it, expect } from 'vitest';
import { createConverterInputFromBuffer, createConverterInputFromStream } from '../src/converter-input.js';

describe('createConverterInputFromBuffer', () => {
  it('returns same buffer from buffer()', async () => {
    const buf = new TextEncoder().encode('hello');
    const input = createConverterInputFromBuffer(buf, 1024);
    const result = await input.buffer();
    expect(result).toBe(buf);
  });

  it('creates readable stream from stream()', async () => {
    const buf = new TextEncoder().encode('hello');
    const input = createConverterInputFromBuffer(buf, 1024);
    const reader = input.stream().getReader();
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    const text = new TextDecoder().decode(chunks[0]);
    expect(text).toBe('hello');
  });

  it('stream() is re-callable', async () => {
    const buf = new TextEncoder().encode('hello');
    const input = createConverterInputFromBuffer(buf, 1024);
    const read = async () => {
      const reader = input.stream().getReader();
      const { value } = await reader.read();
      return new TextDecoder().decode(value!);
    };
    expect(await read()).toBe('hello');
    expect(await read()).toBe('hello');
  });
});

describe('createConverterInputFromStream', () => {
  it('buffers stream on first buffer() call', async () => {
    const buf = new TextEncoder().encode('hello');
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(buf);
        controller.close();
      },
    });
    const input = createConverterInputFromStream(stream, 1024);
    const result = await input.buffer();
    expect(new TextDecoder().decode(result)).toBe('hello');
  });

  it('caches buffer on subsequent calls', async () => {
    const buf = new TextEncoder().encode('hello');
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(buf);
        controller.close();
      },
    });
    const input = createConverterInputFromStream(stream, 1024);
    const first = await input.buffer();
    const second = await input.buffer();
    expect(first).toBe(second);
  });

  it('throws FileTooLargeError when stream exceeds maxBufferSize', async () => {
    const bigChunk = new Uint8Array(2048);
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(bigChunk);
        controller.close();
      },
    });
    const input = createConverterInputFromStream(stream, 1024);
    await expect(input.buffer()).rejects.toThrow('File too large');
  });
});
