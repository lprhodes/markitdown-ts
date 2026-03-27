// tests/stream-info.test.ts
import { describe, it, expect } from 'vitest';
import { extensionToMime, mimeToExtension, buildStreamInfo } from '../src/stream-info.js';

describe('extensionToMime', () => {
  it('maps .pdf to application/pdf', () => {
    expect(extensionToMime('.pdf')).toBe('application/pdf');
  });

  it('maps .docx', () => {
    expect(extensionToMime('.docx')).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  });

  it('returns undefined for unknown', () => {
    expect(extensionToMime('.xyz123')).toBeUndefined();
  });
});

describe('mimeToExtension', () => {
  it('maps application/pdf to .pdf', () => {
    expect(mimeToExtension('application/pdf')).toBe('.pdf');
  });
});

describe('buildStreamInfo', () => {
  it('infers MIME from extension', () => {
    const info = buildStreamInfo({ extension: '.pdf' });
    expect(info.mimetype).toBe('application/pdf');
  });

  it('infers extension from MIME', () => {
    const info = buildStreamInfo({ mimetype: 'application/pdf' });
    expect(info.extension).toBe('.pdf');
  });

  it('preserves provided values', () => {
    const info = buildStreamInfo({ extension: '.pdf', mimetype: 'application/pdf', filename: 'test.pdf' });
    expect(info.filename).toBe('test.pdf');
  });

  it('extracts extension from filename', () => {
    const info = buildStreamInfo({ filename: 'report.docx' });
    expect(info.extension).toBe('.docx');
    expect(info.mimetype).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  });
});
