// tests/security.test.ts
import { describe, it, expect } from 'vitest';
import { MarkItDown } from '../src/markitdown.js';

describe('XSS sanitization', () => {
  it('strips event handler attributes', async () => {
    const md = new MarkItDown();
    const html = '<div onmouseover="alert(1)">Hello</div>';
    const buffer = new TextEncoder().encode(html);
    const result = await md.convertBuffer(buffer, {
      streamInfo: { mimetype: 'text/html' },
    });
    expect(result.markdown).not.toContain('onmouseover');
    expect(result.markdown).toContain('Hello');
  });

  it('removes iframe elements', async () => {
    const md = new MarkItDown();
    const html = '<p>Safe</p><iframe src="javascript:alert(1)"></iframe>';
    const buffer = new TextEncoder().encode(html);
    const result = await md.convertBuffer(buffer, {
      streamInfo: { mimetype: 'text/html' },
    });
    expect(result.markdown).not.toContain('iframe');
    expect(result.markdown).toContain('Safe');
  });

  it('removes javascript links', async () => {
    const md = new MarkItDown();
    const html = '<a href="javascript:void(0)">Click</a>';
    const buffer = new TextEncoder().encode(html);
    const result = await md.convertBuffer(buffer, {
      streamInfo: { mimetype: 'text/html' },
    });
    expect(result.markdown).not.toContain('javascript');
    expect(result.markdown).toContain('Click');
  });
});

describe('SSRF protection', () => {
  it('blocks URL fetch by default', async () => {
    const md = new MarkItDown();
    await expect(
      md.convert('https://example.com/test.pdf'),
    ).rejects.toThrow('allowUrlFetch');
  });
});

describe('Path traversal prevention', () => {
  it('sanitizes path traversal in ZIP entries', async () => {
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    zip.file('../../etc/passwd', 'malicious content');
    zip.file('normal.txt', 'safe content');
    const buffer = await zip.generateAsync({ type: 'uint8array' });

    const md = new MarkItDown();
    const result = await md.convertBuffer(buffer, {
      streamInfo: { filename: 'test.zip' },
    });

    // Should not have the traversal path in output
    expect(result.markdown).not.toContain('../../etc/passwd');
    // Should still process the safe file
    expect(result.markdown).toContain('safe content');
  });

  it('rejects absolute paths in ZIP entries', async () => {
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    zip.file('/etc/shadow', 'root:x:0:0');
    zip.file('readme.txt', 'hello');
    const buffer = await zip.generateAsync({ type: 'uint8array' });

    const md = new MarkItDown();
    const result = await md.convertBuffer(buffer, {
      streamInfo: { filename: 'test.zip' },
    });

    expect(result.markdown).not.toContain('/etc/shadow');
    expect(result.markdown).toContain('hello');
  });
});

describe('Script injection in HTML', () => {
  it('strips script tags', async () => {
    const md = new MarkItDown();
    const html = '<p>Hello</p><script>alert("xss")</script><p>World</p>';
    const buffer = new TextEncoder().encode(html);
    const result = await md.convertBuffer(buffer, {
      streamInfo: { mimetype: 'text/html' },
    });
    expect(result.markdown).not.toContain('<script');
    expect(result.markdown).not.toContain('alert');
    expect(result.markdown).toContain('Hello');
    expect(result.markdown).toContain('World');
  });

  it('strips style tags', async () => {
    const md = new MarkItDown();
    const html = '<style>body { background: red; }</style><p>Content</p>';
    const buffer = new TextEncoder().encode(html);
    const result = await md.convertBuffer(buffer, {
      streamInfo: { mimetype: 'text/html' },
    });
    expect(result.markdown).not.toContain('<style');
    expect(result.markdown).not.toContain('background');
    expect(result.markdown).toContain('Content');
  });
});
