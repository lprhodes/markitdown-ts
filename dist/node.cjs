"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/node.ts
var node_exports = {};
__export(node_exports, {
  createAudioTranscriber: () => createAudioTranscriber,
  createExiftoolReader: () => createExiftoolReader,
  createFsReader: () => createFsReader
});
module.exports = __toCommonJS(node_exports);
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createAudioTranscriber,
  createExiftoolReader,
  createFsReader
});
//# sourceMappingURL=node.cjs.map