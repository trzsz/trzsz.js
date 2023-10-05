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

function promisify (fs: any, funcs: string[]) {
  for (const func of funcs) {
    fs[func + 'Async'] = (...args) => {
      return new Promise((resolve, reject) => {
        fs[func](...args, (err, data) => {
          if (err) {
            return reject(err);
          } else {
            resolve(data || true);
          }
        })
      })
    }
  }
}

promisify(
  fs,
  [
    'stat',
    'access',
    'mkdir',
    'readdir',
    'read',
    'close',
    'open',
    'realpath',
    'write'
  ]
);

function fsExists (fp: string) {
  return fs.accessAsync(fp)
    .then(() => true)
    .catch(() => false)
}

export async function checkPathWritable(filePath: string) {
  if (!filePath) {
    return false;
  }

  if (!await fsExists(filePath)) {
    throw new TrzszError(`No such directory: ${filePath}`);
  }
  const stats = await fs.statAsync(filePath);
  if (!stats.isDirectory()) {
    throw new TrzszError(`Not a directory: ${filePath}`);
  }
  try {
    await fs.accessAsync(filePath, fs.constants.W_OK);
  } catch (err) {
    throw new TrzszError(`No permission to write: ${filePath}`);
  }

  return true;
}

class NodefsFileReader implements TrzszFileReader {
  private pathId: number;
  private absPath: string;
  private relPath: string[];
  private dir: boolean;
  private size: number;
  private closed: boolean = false;
  private fd: number | null = null;

  constructor(pathId: number, absPath: string, relPath: string[], dir: boolean, size: number) {
    this.pathId = pathId;
    this.absPath = absPath;
    this.relPath = relPath;
    this.dir = dir;
    this.size = size;
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
    return this.size;
  }

  public async readFile(buf: ArrayBuffer) {
    if (this.closed) {
      throw new TrzszError(`File closed: ${this.absPath}`, null, true);
    }
    if (this.fd === null) {
      this.fd = await fs.openAsync(this.absPath, "r");
    }
    const uint8 = new Uint8Array(buf);
    const n = await fs.readAsync(this.fd, uint8, 0, uint8.length, null);
    return uint8.subarray(0, n);
  }

  public async closeFile() {
    if (!this.closed) {
      this.closed = true;
      if (this.fd !== null) {
        await fs.closeAsync(this.fd);
        this.fd = null;
      }
    }
  }
}

async function checkPathReadable(
  pathId: number,
  absPath: string,
  stats: any,
  fileList: NodefsFileReader[],
  relPath: string[],
  visitedDir: Set<string>
) {
  if (!stats.isDirectory()) {
    if (!stats.isFile()) {
      throw new TrzszError(`Not a regular file: ${absPath}`);
    }
    try {
      await fs.accessAsync(absPath, fs.constants.R_OK);
    } catch (err) {
      throw new TrzszError(`No permission to read: ${absPath}`);
    }
    fileList.push(new NodefsFileReader(pathId, absPath, relPath, false, stats.size));
    return;
  }

  const realPath = await fs.realpathAsync(absPath);
  if (visitedDir.has(realPath)) {
    throw new TrzszError(`Duplicate link: ${absPath}`);
  }
  visitedDir.add(realPath);
  fileList.push(new NodefsFileReader(pathId, absPath, relPath, true, 0));
  const arr = await fs.readdirAsync(absPath)
  for (const file of arr) {
    const filePath = path.join(absPath, file);
    const stat = await fs.statAsync(filePath)
    await checkPathReadable(pathId, filePath, stat, fileList, [...relPath, file], visitedDir);
  }
}

export async function checkPathsReadable(
  filePaths: string[] | undefined,
  directory: boolean = false
): Promise<TrzszFileReader[] | undefined> {
  if (!filePaths || !filePaths.length) {
    return undefined;
  }
  const fileList: NodefsFileReader[] = [];
  const entries = filePaths.entries()
  for (const [idx, filePath] of entries) {
    const absPath = path.resolve(filePath);
    if (!await fsExists(absPath)) {
      throw new TrzszError(`No such file: ${absPath}`);
    }
    const stats = await fs.statAsync(absPath);
    if (!directory && stats.isDirectory()) {
      throw new TrzszError(`Is a directory: ${absPath}`);
    }
    const visitedDir = new Set<string>();
    await checkPathReadable(idx, absPath, stats, fileList, [path.basename(absPath)], visitedDir);
  }
  return fileList;
}

class NodefsFileWriter implements TrzszFileWriter {
  private fileName: string;
  private localName: string;
  private fd: number | null;
  private dir: boolean;
  private closed: boolean = false;

  constructor(fileName, localName: string, fd: number | null, dir: boolean = false) {
    this.fileName = fileName;
    this.localName = localName;
    this.fd = fd;
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
    await fs.writeAsync(this.fd, buf);
  }

  public async closeFile() {
    if (!this.closed) {
      this.closed = true;
      if (this.fd !== null) {
        await fs.closeAsync(this.fd);
        this.fd = null;
      }
    }
  }
}

async function getNewName(savePath: string, fileName: string) {
  if (!fsExists(path.join(savePath, fileName))) {
    return fileName;
  }
  for (let i = 0; i < 1000; i++) {
    const saveName = `${fileName}.${i}`;
    if (!await fsExists(path.join(savePath, saveName))) {
      return saveName;
    }
  }
  throw new TrzszError("Fail to assign new file name");
}

async function doCreateFile(absPath: string) {
  try {
    return fs.openAsync(absPath, "w");
  } catch (err) {
    if (err.errno === -13 || err.errno === -4048) {
      throw new TrzszError(`No permission to write: ${absPath}`);
    } else if (err.errno === -21 || err.errno === -4068) {
      throw new TrzszError(`Is a directory: ${absPath}`);
    }
    throw err;
  }
}

async function doCreateDirectory(absPath: string) {
  if (!await fsExists(absPath)) {
    await fs.mkdirAsync(absPath, { recursive: true, mode: 0o755 });
  }
  const stats = await fs.statAsync(absPath);
  if (!stats.isDirectory()) {
    throw new TrzszError(`Not a directory: ${absPath}`);
  }
}

async function createFile(savePath, fileName: string, overwrite: boolean) {
  const localName = overwrite ? fileName : await getNewName(savePath, fileName);
  const fd = await doCreateFile(path.join(savePath, localName));
  return new NodefsFileWriter(fileName, localName, fd);
}

export async function openSaveFile(saveParam: any, fileName: string, directory: boolean, overwrite: boolean) {
  if (!directory) {
    return createFile(saveParam.path, fileName, overwrite);
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
      localName = await getNewName(saveParam.path, file.path_name[0]);
      saveParam.maps.set(file.path_id, localName);
    }
  }

  let fullPath: string;
  if (file.path_name.length > 1) {
    const p = path.join(saveParam.path, localName, ...file.path_name.slice(1, file.path_name.length - 1));
    await doCreateDirectory(p);
    fullPath = path.join(p, fileName);
  } else {
    fullPath = path.join(saveParam.path, localName);
  }

  if (file.is_dir === true) {
    await doCreateDirectory(fullPath);
    return new NodefsFileWriter(fileName, localName, null, true);
  }

  const fd = await doCreateFile(fullPath);
  return new NodefsFileWriter(fileName, localName, fd);
}
