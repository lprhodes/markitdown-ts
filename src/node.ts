// src/node.ts
// Node-only helpers for @lprhodes/markitdown-ts/node subpath export.
// Implementations added in Task 31.

export function createFsReader(): (path: string) => Promise<Uint8Array> {
  throw new Error('Not yet implemented');
}

export function createExiftoolReader(): any {
  throw new Error('Not yet implemented');
}

export function createAudioTranscriber(): any {
  throw new Error('Not yet implemented');
}
