/**
 * trzsz: https://github.com/trzsz/trzsz.js
 * Copyright(c) 2022 Lonny Wong <lonnywong@qq.com>
 * @license MIT
 */

/* eslint-disable require-jsdoc */

import { TrzszError, TrzszFileReader, TrzszFileWriter } from "./comm";

class BrowserFileReader implements TrzszFileReader {
  private closed: boolean = false;
  private file: File | null;
  private pos: number = 0;

  constructor(file: File) {
    this.file = file;
  }

  public getName(): string {
    return this.file.name;
  }

  public getSize(): number {
    return this.file.size;
  }

  public async readFile(buf: ArrayBuffer) {
    if (this.pos >= this.file.size) {
      return new Uint8Array(0);
    }
    const len = Math.min(buf.byteLength, this.file.size - this.pos);
    const chunk = this.file.slice(this.pos, this.pos + len);
    this.pos += len;
    return new Uint8Array(await chunk.arrayBuffer());
  }

  public closeFile() {
    if (!this.closed) {
      this.file = null;
      this.closed = true;
    }
  }
}

export async function selectSendFiles(): Promise<TrzszFileReader[] | undefined> {
  if (!window.hasOwnProperty("showOpenFilePicker")) {
    throw new TrzszError("The browser doesn't support the File System Access API");
  }

  let fileHandleArray;
  try {
    // @ts-ignore
    fileHandleArray = await window.showOpenFilePicker({ multiple: true });
  } catch (err) {
    if (err.name === "AbortError") {
      return undefined;
    }
    throw err;
  }

  if (!fileHandleArray || !fileHandleArray.length) {
    return undefined;
  }

  const bfrArray: BrowserFileReader[] = [];
  for (const fileHandle of fileHandleArray) {
    bfrArray.push(new BrowserFileReader(await fileHandle.getFile()));
  }
  return bfrArray;
}

class BrowserFileWriter implements TrzszFileWriter {
  private writer; // FileSystemWritableFileStream
  private closed: boolean = false;
  private name: string;

  constructor(name: string, writer) {
    this.name = name;
    this.writer = writer;
  }

  public getName(): string {
    return this.name;
  }

  public async writeFile(buf: Uint8Array) {
    await this.writer.write(buf);
  }

  public closeFile() {
    if (!this.closed) {
      this.writer.close();
      this.writer = null;
      this.closed = true;
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function openSaveFile(savePath: string, fileName: string, overwrite: boolean) {
  if (!window.hasOwnProperty("showSaveFilePicker")) {
    throw new TrzszError("The browser doesn't support the File System Access API");
  }

  let fileHandle;
  try {
    // @ts-ignore
    fileHandle = await window.showSaveFilePicker({ suggestedName: fileName });
  } catch (err) {
    if (err.name === "AbortError") {
      throw new TrzszError("Cancelled");
    }
    throw err;
  }

  if (!fileHandle) {
    throw new TrzszError("Cancelled");
  }

  const file = await fileHandle.getFile();
  const writer = await fileHandle.createWritable();
  return new BrowserFileWriter(file.name, writer);
}
