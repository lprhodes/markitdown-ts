import { describe, it, expect } from 'vitest';
import { MarkItDown } from '../src/markitdown.js';

describe('Edge runtime compatibility', () => {
  it('creates MarkItDown without nodeServices', () => {
    const md = new MarkItDown();
    expect(md).toBeDefined();
  });

  it('converts plain text without Node dependencies', async () => {
    const md = new MarkItDown();
    const buffer = new TextEncoder().encode('Hello, world!');
    const result = await md.convertBuffer(buffer, {
      streamInfo: { filename: 'test.txt' },
    });
    expect(result.markdown).toContain('Hello, world!');
  });

  it('converts JSON without Node dependencies', async () => {
    const md = new MarkItDown();
    const buffer = new TextEncoder().encode('{"key": "value"}');
    const result = await md.convertBuffer(buffer, {
      streamInfo: { filename: 'test.json' },
    });
    expect(result.markdown).toContain('"key"');
  });

  it('converts HTML without Node dependencies', async () => {
    const md = new MarkItDown();
    const html = '<h1>Title</h1><p>Paragraph with <strong>bold</strong> text.</p>';
    const buffer = new TextEncoder().encode(html);
    const result = await md.convertBuffer(buffer, {
      streamInfo: { mimetype: 'text/html' },
    });
    expect(result.markdown).toContain('Title');
    expect(result.markdown).toContain('bold');
  });

  it('converts CSV without Node dependencies', async () => {
    const md = new MarkItDown();
    const csv = 'Name,Age\nAlice,30\nBob,25\n';
    const buffer = new TextEncoder().encode(csv);
    const result = await md.convertBuffer(buffer, {
      streamInfo: { filename: 'data.csv' },
    });
    expect(result.markdown).toContain('Alice');
    expect(result.markdown).toContain('Bob');
  });

  it('ImageConverter gracefully degrades without nodeServices', async () => {
    const md = new MarkItDown();
    const buffer = new Uint8Array(100);
    const result = await md.convertBuffer(buffer, {
      streamInfo: { filename: 'photo.jpg', mimetype: 'image/jpeg' },
    });
    expect(result.markdown).toContain('photo.jpg');
  });

  it('AudioConverter gracefully degrades without nodeServices', async () => {
    const md = new MarkItDown();
    const buffer = new Uint8Array(100);
    const result = await md.convertBuffer(buffer, {
      streamInfo: { filename: 'audio.mp3', mimetype: 'audio/mpeg' },
    });
    expect(result.markdown).toContain('audio.mp3');
  });

  it('rejects file paths without nodeServices.readFile', async () => {
    const md = new MarkItDown();
    await expect(
      md.convert('/tmp/test.pdf'),
    ).rejects.toThrow('nodeServices.readFile');
  });

  it('rejects file:// URIs without nodeServices.readFile', async () => {
    const md = new MarkItDown();
    await expect(
      md.convert('file:///tmp/test.pdf'),
    ).rejects.toThrow('nodeServices.readFile');
  });

  it('handles data URIs without Node dependencies', async () => {
    const md = new MarkItDown();
    const text = 'data URI content';
    const base64 = btoa(text);
    const dataUri = `data:text/plain;base64,${base64}`;
    const result = await md.convert(dataUri);
    expect(result.markdown).toContain('data URI content');
  });

  it('convertStream works with Web ReadableStream (no Node streams needed)', async () => {
    const md = new MarkItDown();
    const data = new TextEncoder().encode('streamed text');
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(data);
        controller.close();
      },
    });
    const result = await md.convertStream(stream, {
      streamInfo: { filename: 'test.txt' },
    });
    expect(result.markdown).toContain('streamed text');
  });

  it('handles empty input gracefully', async () => {
    const md = new MarkItDown();
    const buffer = new TextEncoder().encode('');
    const result = await md.convertBuffer(buffer, {
      streamInfo: { filename: 'empty.txt' },
    });
    expect(result.markdown).toBeDefined();
  });
});
