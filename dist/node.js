// src/node.ts
function createFsReader() {
  return async (filePath) => {
    const { readFile } = await import("fs/promises");
    const buffer = await readFile(filePath);
    return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  };
}
function createExiftoolReader() {
  return async (input, info) => {
    let exiftool;
    try {
      const mod = await import("exiftool-vendored");
      exiftool = new mod.ExifTool();
    } catch {
      throw new Error(
        "exiftool-vendored is required for EXIF metadata extraction. Install with: pnpm add exiftool-vendored"
      );
    }
    try {
      if (!info.localPath) {
        const { writeFile, mkdtemp, unlink } = await import("fs/promises");
        const { tmpdir } = await import("os");
        const { join } = await import("path");
        const dir = await mkdtemp(join(tmpdir(), "markitdown-"));
        const ext = info.extension ?? ".tmp";
        const tempPath = join(dir, `temp${ext}`);
        const buffer = await input.buffer();
        await writeFile(tempPath, buffer);
        try {
          const tags2 = await exiftool.read(tempPath);
          return tags2;
        } finally {
          await unlink(tempPath).catch(() => {
          });
          const { rmdir } = await import("fs/promises");
          await rmdir(dir).catch(() => {
          });
        }
      }
      const tags = await exiftool.read(info.localPath);
      return tags;
    } finally {
      await exiftool.end();
    }
  };
}
function createAudioTranscriber(transcribeFn) {
  return async (input, info) => {
    if (!transcribeFn) {
      throw new Error(
        "Audio transcription requires a transcribeFn callback. Provide a function that accepts a file path and returns a transcript."
      );
    }
    if (info.localPath) {
      return transcribeFn(info.localPath);
    }
    const { writeFile, mkdtemp, unlink } = await import("fs/promises");
    const { tmpdir } = await import("os");
    const { join } = await import("path");
    const dir = await mkdtemp(join(tmpdir(), "markitdown-"));
    const ext = info.extension ?? ".tmp";
    const tempPath = join(dir, `temp${ext}`);
    const buffer = await input.buffer();
    await writeFile(tempPath, buffer);
    try {
      return await transcribeFn(tempPath);
    } finally {
      await unlink(tempPath).catch(() => {
      });
      const { rmdir } = await import("fs/promises");
      await rmdir(dir).catch(() => {
      });
    }
  };
}
export {
  createAudioTranscriber,
  createExiftoolReader,
  createFsReader
};
//# sourceMappingURL=node.js.map