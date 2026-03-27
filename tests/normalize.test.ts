// tests/normalize.test.ts
import { describe, it, expect } from 'vitest';
import { normalizeOutput } from '../src/normalize.js';

describe('normalizeOutput', () => {
  it('strips trailing whitespace from each line', () => {
    expect(normalizeOutput('hello   \nworld  ')).toBe('hello\nworld');
  });

  it('collapses 3+ consecutive newlines to 2', () => {
    expect(normalizeOutput('a\n\n\n\nb')).toBe('a\n\nb');
  });

  it('trims leading and trailing newlines', () => {
    expect(normalizeOutput('\n\nhello\n\n')).toBe('hello');
  });

  it('handles combined normalization', () => {
    const input = '\n\nhello   \n\n\n\nworld  \n\n';
    expect(normalizeOutput(input)).toBe('hello\n\nworld');
  });

  it('returns empty string for whitespace-only input', () => {
    expect(normalizeOutput('   \n\n   ')).toBe('');
  });
});
