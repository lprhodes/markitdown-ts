// tests/errors.test.ts
import { describe, it, expect } from 'vitest';
import {
  MarkItDownError,
  MissingDependencyError,
  UnsupportedFormatError,
  FileConversionError,
  FileTooLargeError,
} from '../src/errors.js';

describe('Error classes', () => {
  it('MissingDependencyError has dependency and installCommand', () => {
    const err = new MissingDependencyError('pdfjs-dist', 'pnpm add pdfjs-dist');
    expect(err).toBeInstanceOf(MarkItDownError);
    expect(err).toBeInstanceOf(Error);
    expect(err.dependency).toBe('pdfjs-dist');
    expect(err.installCommand).toBe('pnpm add pdfjs-dist');
    expect(err.message).toContain('pdfjs-dist');
  });

  it('UnsupportedFormatError is MarkItDownError', () => {
    const err = new UnsupportedFormatError('.xyz');
    expect(err).toBeInstanceOf(MarkItDownError);
    expect(err.message).toContain('.xyz');
  });

  it('FileConversionError has attempts', () => {
    const attempts = [{ converter: 'PdfConverter', error: new Error('parse failed') }];
    const err = new FileConversionError(attempts);
    expect(err).toBeInstanceOf(MarkItDownError);
    expect(err.attempts).toHaveLength(1);
    expect(err.attempts[0].converter).toBe('PdfConverter');
  });

  it('FileTooLargeError has size and limit', () => {
    const err = new FileTooLargeError(200_000_000, 100_000_000);
    expect(err).toBeInstanceOf(MarkItDownError);
    expect(err.size).toBe(200_000_000);
    expect(err.limit).toBe(100_000_000);
    expect(err.message).toContain('100');
  });
});
