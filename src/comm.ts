/**
 * trzsz: https://github.com/trzsz/trzsz.js
 * Copyright(c) 2022 Lonny Wong <lonnywong@qq.com>
 * @license MIT
 */

import * as Pako from "pako";
import * as Base64 from "base64-js";

/* eslint-disable require-jsdoc */

export function strToUint8(str: string): Uint8Array {
  return Uint8Array.from(str, (v) => v.charCodeAt(0));
}

export async function uint8ToStr(buf: Uint8Array): Promise<string> {
  return new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsText(new Blob([buf]));
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
        message = `decode [${message}] error: ${err.message}`;
      }
    } else {
      if (type) {
        message = `[TrzszError] ${type}: ${message}`;
      }
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
    if (this.type === "fail") {
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
    return err.stack.replace("TrzszError: ", "");
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

export type OpenSaveFile = (savePath: string, fileName: string, overwrite: boolean) => Promise<TrzszFileWriter>;

export interface ProgressCallback {
  onNum: (num: number) => void;
  onName: (name: string) => void;
  onSize: (size: number) => void;
  onStep: (step: number) => void;
  onDone: (name: string) => void;
}
