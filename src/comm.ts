/**
 * trzsz: https://github.com/trzsz/trzsz.js
 * Copyright(c) 2022 Lonny Wong <lonnywong@qq.com>
 * @license MIT
 */

import * as Pako from "pako";
import * as Base64 from "base64-js";

/**
 * trzsz version injected by rollup-plugin-version-injector
 */
export const trzszVersion = "[VersionInject]{version}[/VersionInject]";

/* eslint-disable require-jsdoc */

export const isRunningInBrowser = (function () {
  try {
    if (require.resolve("fs") === "fs") {
      require("fs");
      return false;
    }
  } catch (err) {
    return true;
  }
})();

export function strToUint8(str: string): Uint8Array {
  return Uint8Array.from(str, (v) => v.charCodeAt(0));
}

export async function uint8ToStr(buf: Uint8Array): Promise<string> {
  if (typeof Buffer === "function") {
    return Buffer.from(buf).toString("latin1");
  }
  return new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsBinaryString(new Blob([buf]));
  });
}

export function strToArrBuf(str: string): ArrayBuffer {
  return strToUint8(str).buffer;
}

export function encodeBuffer(buf: string | Uint8Array): string {
  return Base64.fromByteArray(Pako.deflate(buf));
}

export function decodeBuffer(buf: string): Uint8Array {
  return Pako.inflate(Base64.toByteArray(buf));
}

export class TrzszError extends Error {
  private readonly type: string | null;
  private readonly trace: boolean;

  constructor(message: string, type: string | null = null, trace: boolean = false) {
    if (type === "fail" || type === "FAIL" || type === "EXIT") {
      try {
        message = String.fromCharCode.apply(null, decodeBuffer(message));
      } catch (err) {
        message = `decode [${message}] error: ${err}`;
      }
    } else if (type) {
      message = `[TrzszError] ${type}: ${message}`;
    }

    super(message);
    Object.setPrototypeOf(this, TrzszError.prototype);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, TrzszError);
    }

    this.name = "TrzszError";
    this.type = type;
    this.trace = trace;
  }

  public isTraceBack() {
    if (this.type === "fail" || this.type === "EXIT") {
      return false;
    }
    return this.trace;
  }

  public isRemoteExit() {
    return this.type === "EXIT";
  }

  public isRemoteFail() {
    return this.type === "fail" || this.type === "FAIL";
  }

  public static getErrorMessage(err: Error) {
    if (err instanceof TrzszError && !err.isTraceBack()) {
      return err.message;
    }
    if (err.stack) {
      return err.stack.replace("TrzszError: ", "");
    }
    return err.toString();
  }
}

export interface TrzszFile {
  closeFile: () => void;
}

export interface TrzszFileReader extends TrzszFile {
  getPathId: () => number;
  getRelPath: () => string[];
  isDir: () => boolean;
  getSize: () => number;
  readFile: (buf: ArrayBuffer) => Promise<Uint8Array>;
}

export interface TrzszFileWriter extends TrzszFile {
  getFileName: () => string;
  getLocalName: () => string;
  isDir: () => boolean;
  writeFile: (buf: Uint8Array) => Promise<void>;
}

export type OpenSaveFile = (
  saveParam: any,
  fileName: string,
  directory: boolean,
  overwrite: boolean
) => Promise<TrzszFileWriter>;

export interface ProgressCallback {
  onNum: (num: number) => void;
  onName: (name: string) => void;
  onSize: (size: number) => void;
  onStep: (step: number) => void;
  onDone: () => void;
}

export function checkDuplicateNames(files: TrzszFileReader[]) {
  const names = new Set();
  for (const file of files) {
    const path = file.getRelPath().join("/");
    if (names.has(path)) {
      throw new TrzszError(`Duplicate name: ${path}`);
    }
    names.add(path);
  }
}
