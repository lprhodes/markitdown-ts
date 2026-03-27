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
