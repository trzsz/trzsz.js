/**
 * trzsz: https://github.com/trzsz/trzsz.js
 * Copyright(c) 2022 Lonny Wong <lonnywong@qq.com>
 * @license MIT
 */

/* eslint-disable require-jsdoc */

export function strToUint8(str: string): Uint8Array {
  return Uint8Array.from(str, (v) => v.charCodeAt(0));
}

export function uint8ToStr(buf: Uint8Array): string {
  return String.fromCharCode.apply(null, buf);
}

export function strToArrBuf(str: string): ArrayBuffer {
  return strToUint8(str).buffer;
}

export class TrzszError extends Error {
  private readonly type: string | null;
  public readonly trace: boolean;
  constructor(message: string, type: string | null = null, trace: boolean = false) {
    super(message);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, TrzszError);
    }
    this.name = "TrzszError";
    this.type = type;
    this.trace = trace;
  }
}

export interface TrzszFile {
  closeFile: () => void;
}

export interface TrzszFileReader extends TrzszFile {
  getName: () => string;
  getSize: () => number;
  readFile: (buf: ArrayBuffer) => Promise<Uint8Array>;
}

export interface TrzszFileWriter extends TrzszFile {
  getName: () => string;
  writeFile: (buf: Uint8Array) => Promise<void>;
}

export interface ProgressCallback {
  // TODO
}
