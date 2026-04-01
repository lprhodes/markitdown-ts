import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { MarkItDown } from '../src/markitdown.js';

const FIXTURES = resolve(import.meta.dirname, 'fixtures');

describe('PdfConverter', () => {
  it('converts basic PDF', async () => {
    const md = new MarkItDown();
    const buffer = readFileSync(resolve(FIXTURES, 'test.pdf'));
    const result = await md.convertBuffer(buffer, {
      streamInfo: { filename: 'test.pdf' },
    });
    expect(result.markdown).toContain('While there is contemporaneous exploration of multi-agent approaches');
  });

  it('extracts tables from structured PDF', async () => {
    const md = new MarkItDown();
    const buffer = readFileSync(resolve(FIXTURES, 'SPARSE-2024-INV-1234_borderless_table.pdf'));
    const result = await md.convertBuffer(buffer, {
      streamInfo: { filename: 'SPARSE-2024-INV-1234_borderless_table.pdf' },
    });
    // Should produce some markdown output
    expect(result.markdown.length).toBeGreaterThan(0);
  });

  it('handles MasterFormat numbering', async () => {
    const md = new MarkItDown();
    const buffer = readFileSync(resolve(FIXTURES, 'masterformat_partial_numbering.pdf'));
    const result = await md.convertBuffer(buffer, {
      streamInfo: { filename: 'masterformat_partial_numbering.pdf' },
    });
    expect(result.markdown.length).toBeGreaterThan(0);
  });
});
