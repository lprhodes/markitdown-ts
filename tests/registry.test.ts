// tests/registry.test.ts
import { describe, it, expect } from 'vitest';
import { ConverterRegistry } from '../src/converter-registry.js';
import type { DocumentConverter, StreamInfo } from '../src/types.js';
import { PRIORITY_SPECIFIC, PRIORITY_GENERIC } from '../src/constants.js';

function makeConverter(name: string, acceptFn: (info: StreamInfo) => boolean): DocumentConverter {
  return {
    accepts: acceptFn,
    convert: async () => ({ markdown: `converted by ${name}`, title: name }),
  };
}

describe('ConverterRegistry', () => {
  it('finds converter by extension index', () => {
    const reg = new ConverterRegistry();
    const conv = makeConverter('pdf', () => true);
    reg.register(conv, { priority: PRIORITY_SPECIFIC, extensions: ['.pdf'], mimeTypes: ['application/pdf'] });
    const found = reg.findConverters({ extension: '.pdf' });
    expect(found).toHaveLength(1);
    expect(found[0].converter).toBe(conv);
  });

  it('finds converter by MIME prefix index', () => {
    const reg = new ConverterRegistry();
    const conv = makeConverter('pdf', () => true);
    reg.register(conv, { priority: PRIORITY_SPECIFIC, extensions: ['.pdf'], mimeTypes: ['application/pdf'] });
    const found = reg.findConverters({ mimetype: 'application/pdf' });
    expect(found).toHaveLength(1);
  });

  it('returns fallback converters when no index match', () => {
    const reg = new ConverterRegistry();
    const plain = makeConverter('plain', () => true);
    reg.register(plain, { priority: PRIORITY_GENERIC, extensions: ['.txt'], mimeTypes: ['text/'] });
    const found = reg.findConverters({ extension: '.unknown' });
    expect(found).toHaveLength(1);
    expect(found[0].converter).toBe(plain);
  });

  it('sorts by priority (lower first)', () => {
    const reg = new ConverterRegistry();
    const generic = makeConverter('generic', () => true);
    const specific = makeConverter('specific', () => true);
    reg.register(generic, { priority: PRIORITY_GENERIC, extensions: ['.pdf'], mimeTypes: [] });
    reg.register(specific, { priority: PRIORITY_SPECIFIC, extensions: ['.pdf'], mimeTypes: [] });
    const found = reg.findConverters({ extension: '.pdf' });
    expect(found[0].converter).toBe(specific);
    expect(found[1].converter).toBe(generic);
  });

  it('later registration at same priority comes first', () => {
    const reg = new ConverterRegistry();
    const first = makeConverter('first', () => true);
    const second = makeConverter('second', () => true);
    reg.register(first, { priority: 0, extensions: ['.pdf'], mimeTypes: [] });
    reg.register(second, { priority: 0, extensions: ['.pdf'], mimeTypes: [] });
    const found = reg.findConverters({ extension: '.pdf' });
    expect(found[0].converter).toBe(second);
  });

  it('filters by accepts()', () => {
    const reg = new ConverterRegistry();
    const rejects = makeConverter('rejects', () => false);
    const accepts = makeConverter('accepts', () => true);
    reg.register(rejects, { priority: 0, extensions: ['.xml'], mimeTypes: [] });
    reg.register(accepts, { priority: 0, extensions: ['.xml'], mimeTypes: [] });
    const info: StreamInfo = { extension: '.xml' };
    const found = reg.findConverters(info);
    const filtered = found.filter((r) => r.converter.accepts(info));
    expect(filtered).toHaveLength(1);
    expect(filtered[0].converter).toBe(accepts);
  });
});
