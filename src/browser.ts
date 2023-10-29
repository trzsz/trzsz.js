/**
 * trzsz: https://github.com/trzsz/trzsz.js
 * Copyright(c) 2023 Lonny Wong <lonnywong@qq.com>
 * @license MIT
 */

/* eslint-disable require-jsdoc */

import { TrzszError, TrzszFileReader, TrzszFileWriter } from "./comm";

export class BrowserFileReader implements TrzszFileReader {
  private closed: boolean = false;
  private pathId: number;
  private relPath: string[];
  private file: File | null;
  private pos: number = 0;
  private dir: boolean;

  constructor(pathId: number, relPath: string[], file: File | null, dir: boolean) {
    this.pathId = pathId;
    this.relPath = relPath;
    this.file = file;
    this.dir = dir;
  }

  public getPathId(): number {
    return this.pathId;
  }

  public getRelPath(): string[] {
    return this.relPath;
  }

  public isDir(): boolean {
    return this.dir;
  }

  public getSize(): number {
    return this.file.size;
  }

  public async readFile(buf: ArrayBuffer) {
    if (this.pos >= this.file.size) {
      return new Uint8Array(0);
    }
    try {
      const len = Math.min(buf.byteLength, this.file.size - this.pos);
      const chunk = this.file.slice(this.pos, this.pos + len);
      this.pos += len;
      return new Uint8Array(await chunk.arrayBuffer());
    } catch (err) {
      if (err.name === "NotReadableError") {
        throw new TrzszError(`No permission to read: ${this.relPath.join("/")}`);
      }
      throw new TrzszError(`Read ${this.relPath.join("/")} error: ${err.toString()}`);
    }
  }

  public closeFile() {
    if (!this.closed) {
      this.file = null;
      this.closed = true;
    }
  }
}

export async function parseFileSystemHandle(
  pathId: number,
  handle: FileSystemHandle,
  fileList: BrowserFileReader[],
  relPath: string[],
) {
  if (handle.kind === "file") {
    const file = await (handle as FileSystemFileHandle).getFile();
    fileList.push(new BrowserFileReader(pathId, relPath, file, false));
  } else if (handle.kind === "directory") {
    fileList.push(new BrowserFileReader(pathId, relPath, null, true));
    const dirHandle = handle as any; // FileSystemDirectoryHandle
    for await (const entry of dirHandle.values()) {
      const name = entry.name;
      if (entry.kind === "file") {
        await parseFileSystemHandle(pathId, await dirHandle.getFileHandle(name), fileList, [...relPath, name]);
      } else if (entry.kind === "directory") {
        await parseFileSystemHandle(pathId, await dirHandle.getDirectoryHandle(name), fileList, [...relPath, name]);
      }
    }
  }
}

function newFileSystemError(): TrzszError {
  if (
    window.location.protocol !== "https:" &&
    !["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname)
  ) {
    return new TrzszError("The File System Access API requires HTTPS except localhost");
  }
  return new TrzszError("The browser doesn't support the File System Access API");
}

export async function selectSendFiles(): Promise<TrzszFileReader[] | undefined> {
  // @ts-ignore
  if (typeof window.showOpenFilePicker !== "function") {
    throw newFileSystemError();
  }

  let fileHandleArray: FileSystemFileHandle[];
  try {
    // @ts-ignore
    fileHandleArray = await window.showOpenFilePicker({ id: "trzsz_upload", startIn: "documents", multiple: true });
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
  for (const [idx, fileHandle] of fileHandleArray.entries()) {
    const file = await fileHandle.getFile();
    bfrArray.push(new BrowserFileReader(idx, [file.name], file, false));
  }
  return bfrArray;
}

export async function selectSendDirectories(): Promise<TrzszFileReader[] | undefined> {
  // @ts-ignore
  if (typeof window.showDirectoryPicker !== "function") {
    throw newFileSystemError();
  }

  let dirHandle: FileSystemDirectoryHandle;
  try {
    // @ts-ignore
    dirHandle = await window.showDirectoryPicker({ id: "trzsz_upload", startIn: "documents" });
  } catch (err) {
    if (err.name === "AbortError") {
      return undefined;
    }
    throw err;
  }

  const fileList: BrowserFileReader[] = [];
  await parseFileSystemHandle(0, dirHandle, fileList, [dirHandle.name]);
  return fileList;
}

class BrowserFileWriter implements TrzszFileWriter {
  private writer: FileSystemWritableFileStream;
  private closed: boolean = false;
  private fileName: string;
  private localName: string;
  private dir: boolean;

  constructor(fileName: string, localName: string, writer: any, dir: boolean = false) {
    this.fileName = fileName;
    this.localName = localName;
    this.writer = writer;
    this.dir = dir;
  }

  public getFileName(): string {
    return this.fileName;
  }

  public getLocalName(): string {
    return this.localName;
  }

  public isDir(): boolean {
    return this.dir;
  }

  public async writeFile(buf: Uint8Array) {
    await this.writer.write(buf);
  }

  public closeFile() {
    if (!this.closed) {
      void this.writer.close();
      this.writer = null;
      this.closed = true;
    }
  }
}

export async function selectSaveDirectory(): Promise<FileSystemDirectoryHandle | undefined> {
  // @ts-ignore
  if (typeof window.showDirectoryPicker !== "function") {
    throw newFileSystemError();
  }

  try {
    // @ts-ignore
    return await window.showDirectoryPicker({ id: "trzsz_download", startIn: "downloads", mode: "readwrite" });
  } catch (err) {
    if (err.name === "AbortError") {
      return undefined;
    }
    throw err;
  }
}

async function getNewName(dirHandle: FileSystemDirectoryHandle, fileName: string) {
  const nameSet = new Set();
  // @ts-ignore
  for await (const entry of dirHandle.values()) {
    nameSet.add(entry.name);
  }
  if (!nameSet.has(fileName)) {
    return fileName;
  }
  for (let i = 0; i < 1000; i++) {
    const saveName = `${fileName}.${i}`;
    if (!nameSet.has(saveName)) {
      return saveName;
    }
  }
}

async function doCreateFile(handle: FileSystemDirectoryHandle, fullPath: string[]) {
  try {
    const fileHandle = await handle.getFileHandle(fullPath[fullPath.length - 1], { create: true });
    // @ts-ignore
    return await fileHandle.createWritable();
  } catch (err) {
    if (err.name === "NoModificationAllowedError") {
      throw new TrzszError(`No permission to write: ${fullPath.join("/")}`);
    } else if (err.name === "TypeMismatchError") {
      throw new TrzszError(`Is a directory: ${fullPath.join("/")}`);
    }
    throw new TrzszError(`Write ${fullPath.join("/")} error: ${err.toString()}`);
  }
}

async function doCreateDirectory(handle: FileSystemDirectoryHandle, fullPath: string[]) {
  try {
    return await handle.getDirectoryHandle(fullPath[fullPath.length - 1], { create: true });
  } catch (err) {
    if (err.name === "InvalidStateError") {
      throw new TrzszError(`No permission to create: ${fullPath.join("/")}`);
    } else if (err.name === "TypeMismatchError") {
      throw new TrzszError(`Not a directory: ${fullPath.join("/")}`);
    }
    throw new TrzszError(`Create ${fullPath.join("/")} error: ${err.toString()}`);
  }
}

async function createFile(handle: FileSystemDirectoryHandle, fileName: string, overwrite: boolean) {
  const localName = overwrite ? fileName : await getNewName(handle, fileName);
  const writer = await doCreateFile(handle, [handle.name, localName]);
  return new BrowserFileWriter(fileName, localName, writer);
}

export async function openSaveFile(saveParam: any, fileName: string, directory: boolean, overwrite: boolean) {
  const rootHandle = saveParam.handle as FileSystemDirectoryHandle;
  if (!directory) {
    return await createFile(rootHandle, fileName, overwrite);
  }

  const file = JSON.parse(fileName);
  if (
    !file.hasOwnProperty("path_name") ||
    !file.hasOwnProperty("path_id") ||
    !file.hasOwnProperty("is_dir") ||
    file.path_name.length < 1
  ) {
    throw new TrzszError(`Invalid name: ${fileName}`);
  }

  fileName = file.path_name[file.path_name.length - 1];
  let localName: string;
  if (overwrite) {
    localName = file.path_name[0];
  } else {
    if (saveParam.maps.has(file.path_id)) {
      localName = saveParam.maps.get(file.path_id);
    } else {
      localName = await getNewName(rootHandle, file.path_name[0]);
      saveParam.maps.set(file.path_id, localName);
    }
  }

  let dirHandle = rootHandle;
  const fullPath: string[] = [rootHandle.name, localName];
  if (file.path_name.length > 1) {
    dirHandle = await doCreateDirectory(dirHandle, fullPath);
    for (let i = 1; i < file.path_name.length - 1; i++) {
      fullPath.push(file.path_name[i]);
      dirHandle = await doCreateDirectory(dirHandle, fullPath);
    }
    fullPath.push(fileName);
  }

  if (file.is_dir === true) {
    await doCreateDirectory(dirHandle, fullPath);
    return new BrowserFileWriter(fileName, localName, null, true);
  }

  const writer = await doCreateFile(dirHandle, fullPath);
  return new BrowserFileWriter(fileName, localName, writer);
}
