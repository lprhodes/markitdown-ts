// tests/uri.test.ts
import { describe, it, expect } from 'vitest';
import { fileUriToPath, parseDataUri } from '../src/uri-utils.js';

describe('fileUriToPath', () => {
  it('parses file URI with empty host', () => {
    const { netloc, path } = fileUriToPath('file:///tmp/test.pdf');
    expect(netloc).toBe('');
    expect(path).toBe('/tmp/test.pdf');
  });

  it('parses file URI without host', () => {
    const { netloc, path } = fileUriToPath('file:/tmp/test.pdf');
    expect(netloc).toBe('');
    expect(path).toBe('/tmp/test.pdf');
  });

  it('parses file URI with localhost', () => {
    const { netloc, path } = fileUriToPath('file://localhost/tmp/test.pdf');
    expect(netloc).toBe('localhost');
    expect(path).toBe('/tmp/test.pdf');
  });

  it('strips query params and fragments', () => {
    const { path } = fileUriToPath('file:///tmp/test.pdf?v=1#page=2');
    expect(path).toBe('/tmp/test.pdf');
  });
});

describe('parseDataUri', () => {
  it('parses base64 data URI', () => {
    const { mimetype, data } = parseDataUri('data:application/pdf;base64,SGVsbG8=');
    expect(mimetype).toBe('application/pdf');
    expect(new TextDecoder().decode(data)).toBe('Hello');
  });

  it('parses URL-encoded data URI', () => {
    const { mimetype, data } = parseDataUri('data:text/plain,Hello%20World');
    expect(mimetype).toBe('text/plain');
    expect(new TextDecoder().decode(data)).toBe('Hello World');
  });

  it('defaults to text/plain when no mimetype', () => {
    const { mimetype } = parseDataUri('data:,Hello');
    expect(mimetype).toBe('text/plain');
  });

  it('extracts charset from attributes', () => {
    const { mimetype, charset } = parseDataUri('data:text/plain;charset=utf-8,Hello');
    expect(mimetype).toBe('text/plain');
    expect(charset).toBe('utf-8');
  });
});
