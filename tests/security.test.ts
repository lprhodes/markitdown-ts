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
