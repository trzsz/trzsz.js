/**
 * trzsz: https://github.com/trzsz/trzsz.js
 * Copyright(c) 2022 Lonny Wong <lonnywong@qq.com>
 * @license MIT
 */

/* eslint-disable require-jsdoc */

const fs = requireSafely("fs");
const path = requireSafely("path");
import { TrzszError, TrzszFileReader, TrzszFileWriter } from "./comm";

function requireSafely(name) {
  try {
    return require(name);
  } catch (err) {
    return undefined;
  }
}

export function checkFilesReadable(filePaths: string[]) {
  if (!filePaths || !filePaths.length) {
    return false;
  }

  for (const filePath of filePaths) {
    if (!fs.existsSync(filePath)) {
      throw new TrzszError(`No such file: ${filePath}`);
    }
    const stats = fs.statSync(filePath);
    if (stats.isDirectory()) {
      throw new TrzszError(`Is a directory: ${filePath}`);
    }
    if (!stats.isFile()) {
      throw new TrzszError(`Not a regular file: ${filePath}`);
    }
    try {
      fs.accessSync(filePath, fs.constants.R_OK);
    } catch (err) {
      throw new TrzszError(`No permission to read: ${filePath}`);
    }
  }

  return true;
}

export function checkPathWritable(filePath: string) {
  if (!filePath) {
    return false;
  }

  if (!fs.existsSync(filePath)) {
    throw new TrzszError(`No such directory: ${filePath}`);
  }
  const stats = fs.statSync(filePath);
  if (!stats.isDirectory()) {
    throw new TrzszError(`Not a directory: ${filePath}`);
  }
  try {
    fs.accessSync(filePath, fs.constants.W_OK);
  } catch (err) {
    throw new TrzszError(`No permission to write: ${filePath}`);
  }

  return true;
}

class NodefsFileReader implements TrzszFileReader {
  private fd: number;
  private name: string;
  private size: number;
  private closed: boolean = false;

  constructor(fd: number, name: string, size: number) {
    this.fd = fd;
    this.name = name;
    this.size = size;
  }

  public getName(): string {
    return this.name;
  }

  public getSize(): number {
    return this.size;
  }

  public async readFile(buf: ArrayBuffer) {
    const uint8 = new Uint8Array(buf);
    const n = fs.readSync(this.fd, uint8, 0, uint8.length, null);
    return uint8.subarray(0, n);
  }

  public closeFile() {
    if (!this.closed) {
      fs.closeSync(this.fd);
      this.closed = true;
      this.fd = -1;
    }
  }
}

export async function openSendFiles(filePaths: string[] | undefined): Promise<TrzszFileReader[] | undefined> {
  if (!filePaths || !filePaths.length) {
    return undefined;
  }

  const nfrArray: NodefsFileReader[] = [];
  try {
    for (const filePath of filePaths) {
      const fd = fs.openSync(filePath, "r");
      const name = path.basename(filePath);
      const { size } = fs.statSync(filePath);
      nfrArray.push(new NodefsFileReader(fd, name, size));
    }
  } catch (err) {
    for (const nfr of nfrArray) {
      nfr.closeFile();
    }
    throw err;
  }

  return nfrArray;
}

class NodefsFileWriter implements TrzszFileWriter {
  private fd: number;
  private name: string;
  private closed: boolean = false;

  constructor(fd: number, name: string) {
    this.fd = fd;
    this.name = name;
  }

  public getName(): string {
    return this.name;
  }

  public async writeFile(buf: Uint8Array) {
    fs.writeSync(this.fd, buf);
  }

  public closeFile() {
    if (!this.closed) {
      fs.closeSync(this.fd);
      this.closed = true;
      this.fd = -1;
    }
  }
}

function getSaveName(savePath: string, fileName: string) {
  if (!fs.existsSync(path.join(savePath, fileName))) {
    return fileName;
  }
  for (let i = 0; i < 1000; i++) {
    const saveName = `${fileName}.${i}`;
    if (!fs.existsSync(path.join(savePath, saveName))) {
      return saveName;
    }
  }
  throw new TrzszError("Fail to assign new file name");
}

export async function openSaveFile(savePath: string, fileName: string, overwrite: boolean) {
  const saveName = overwrite ? fileName : getSaveName(savePath, fileName);
  const filePath = path.join(savePath, saveName);
  try {
    const fd = fs.openSync(filePath, "w");
    return new NodefsFileWriter(fd, saveName);
  } catch (err) {
    if (err.errno === -13) {
      throw new TrzszError(`No permission to write: ${filePath}`);
    } else if (err.errno === -21) {
      throw new TrzszError(`Is a directory: ${filePath}`);
    }
    throw err;
  }
}
