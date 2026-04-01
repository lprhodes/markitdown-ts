import { describe, it, expect, vi } from 'vitest';
import { buildLlmCaptionFn } from '../src/utils/llm-caption.js';

describe('buildLlmCaptionFn', () => {
  it('returns undefined when no options provided', () => {
    const fn = buildLlmCaptionFn({});
    expect(fn).toBeUndefined();
  });

  it('returns callback directly when llmCaption provided', () => {
    const callback = async (buf: Uint8Array, mime: string) => 'test caption';
    const fn = buildLlmCaptionFn({ llmCaption: callback });
    expect(fn).toBe(callback);
  });

  it('callback takes precedence over llmModel', () => {
    const callback = async (buf: Uint8Array, mime: string) => 'callback caption';
    const fn = buildLlmCaptionFn({
      llmCaption: callback,
      llmModel: {} as any, // fake model
    });
    expect(fn).toBe(callback);
  });

  it('returns a function when llmModel provided', () => {
    const fn = buildLlmCaptionFn({ llmModel: {} as any });
    expect(fn).toBeTypeOf('function');
  });
});
