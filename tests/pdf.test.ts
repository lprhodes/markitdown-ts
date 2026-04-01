import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
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

describe('PDF output comparison', () => {
  const expectedOutputDir = resolve(import.meta.dirname, 'expected-outputs');

  const pdfTestCases = [
    'SPARSE-2024-INV-1234_borderless_table',
    'RECEIPT-2024-TXN-98765_retail_purchase',
    'REPAIR-2022-INV-001_multipage',
    'movie-theater-booking-2024',
  ];

  for (const name of pdfTestCases) {
    it(`converts ${name}.pdf`, async () => {
      const fixturePath = resolve(FIXTURES, `${name}.pdf`);
      if (!existsSync(fixturePath)) {
        return; // skip if fixture doesn't exist
      }

      const md = new MarkItDown();
      const buffer = readFileSync(fixturePath);
      const result = await md.convertBuffer(buffer, {
        streamInfo: { filename: `${name}.pdf` },
      });

      // Basic sanity: non-empty output
      expect(result.markdown.length).toBeGreaterThan(0);

      // Try to compare with expected output if it exists
      const expectedPath = resolve(expectedOutputDir, `${name}.md`);
      if (existsSync(expectedPath)) {
        const expected = readFileSync(expectedPath, 'utf-8');
        if (expected.length > 0) {
          // Check that at least some of the expected content appears
          // Filter for significant lines (length > 10, not just markdown formatting)
          const lines = expected.split('\n').filter(
            (l) => l.trim().length > 10 && !l.trim().startsWith('|') && !l.trim().startsWith('---'),
          );
          const matchCount = lines.filter((l) =>
            result.markdown.includes(l.trim()),
          ).length;
          // At least some significant lines should match
          expect(matchCount).toBeGreaterThan(0);
        }
      }
    });
  }
});

describe('PDF annotation extraction', () => {
  it('processes annotations without errors', async () => {
    const md = new MarkItDown();
    const buffer = readFileSync(resolve(FIXTURES, 'test.pdf'));
    const result = await md.convertBuffer(buffer, {
      streamInfo: { filename: 'test.pdf' },
    });
    // test.pdf may not have annotations, but the code path should not crash
    expect(result.markdown).toBeDefined();
    expect(result.markdown.length).toBeGreaterThan(0);
  });

  it('handles PDFs gracefully whether they have annotations or not', async () => {
    const md = new MarkItDown();
    for (const fixture of ['test.pdf', 'SPARSE-2024-INV-1234_borderless_table.pdf']) {
      const buffer = readFileSync(resolve(FIXTURES, fixture));
      const result = await md.convertBuffer(buffer, {
        streamInfo: { filename: fixture },
      });
      expect(result.markdown).toBeDefined();
    }
  });
});

describe('PDF edge cases', () => {
  it('handles scanned/image-based PDF gracefully (may produce empty output)', async () => {
    const fixturePath = resolve(FIXTURES, 'MEDRPT-2024-PAT-3847_medical_report_scan.pdf');
    if (!existsSync(fixturePath)) return;

    const md = new MarkItDown();
    const buffer = readFileSync(fixturePath);
    const result = await md.convertBuffer(buffer, {
      streamInfo: { filename: 'MEDRPT-2024-PAT-3847_medical_report_scan.pdf' },
    });
    // Scanned PDFs may not produce text without OCR — just verify no crash
    expect(result.markdown).toBeDefined();
    expect(typeof result.markdown).toBe('string');
  });

  it('produces consistent output on repeated conversions', async () => {
    const md = new MarkItDown();
    const buffer = readFileSync(resolve(FIXTURES, 'test.pdf'));
    const opts = { streamInfo: { filename: 'test.pdf' } };
    const result1 = await md.convertBuffer(buffer, opts);
    const result2 = await md.convertBuffer(buffer, opts);
    expect(result1.markdown).toBe(result2.markdown);
  });
});
