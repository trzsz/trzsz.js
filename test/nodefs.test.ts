/**
 * trzsz: https://github.com/trzsz/trzsz.js
 * Copyright(c) 2022 Lonny Wong <lonnywong@qq.com>
 * @license MIT
 */

const os = require("os");
const fs = require("fs");
const path = require("path");
import { strToUint8 } from "../src/comm";
import { checkFilesReadable, checkPathWritable, openSendFiles, openSaveFile } from "../src/nodefs";

let tmpDir: string;
let tmpFile: string;
let linkPath: string;
let notExistFile: string;

beforeEach(() => {
  jest.resetModules();
});

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "nodefs-test-"));
  tmpFile = path.join(tmpDir, "test.txt");
  fs.closeSync(fs.openSync(tmpFile, "w"));
  linkPath = path.join(tmpDir, "link.txt");
  fs.linkSync(tmpFile, linkPath);
  notExistFile = path.join(tmpDir, "not_exist.txt");
});

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true });
});

test("require fs and path", () => {
  jest.doMock("fs", () => {
    throw new Error("no require in browser");
  });
  jest.doMock("path", () => {
    throw new Error("no require in browser");
  });
  require("../src/nodefs");
});

test("check files readable", () => {
  expect(checkFilesReadable(undefined)).toBe(false);
  expect(checkFilesReadable([])).toBe(false);

  fs.chmodSync(tmpFile, 0o444);
  expect(checkFilesReadable([tmpFile])).toBe(true);
  expect(checkFilesReadable([linkPath])).toBe(true);

  expect(() => checkFilesReadable([notExistFile])).toThrowError("No such file");
  expect(() => checkFilesReadable([tmpFile, notExistFile])).toThrowError("No such file");

  expect(() => checkFilesReadable([tmpDir])).toThrowError("Is a directory");
  expect(() => checkFilesReadable([tmpFile, tmpDir])).toThrowError("Is a directory");

  expect(() => checkFilesReadable(["/dev/stdin"])).toThrowError("Not a regular file");
  expect(() => checkFilesReadable([tmpFile, "/dev/stdin"])).toThrowError("Not a regular file");

  fs.chmodSync(tmpFile, 0o222);
  expect(() => checkFilesReadable([tmpFile])).toThrowError("No permission to read");
  fs.chmodSync(tmpFile, 0o444);
});

test("check path writable", () => {
  expect(checkPathWritable(undefined)).toBe(false);
  expect(checkPathWritable(null)).toBe(false);

  fs.chmodSync(tmpDir, 0o777);
  expect(checkPathWritable(tmpDir)).toBe(true);

  expect(() => checkPathWritable(notExistFile)).toThrowError("No such directory");
  expect(() => checkPathWritable(tmpFile)).toThrowError("Not a directory");

  fs.chmodSync(tmpDir, 0o444);
  expect(() => checkPathWritable(tmpDir)).toThrowError("No permission to write");
  fs.chmodSync(tmpDir, 0o777);
});

test("open send files", async () => {
  expect(await openSendFiles(undefined)).toBe(undefined);
  expect(await openSendFiles([])).toBe(undefined);

  const testPath = path.join(tmpDir, "send.txt");
  const fd = fs.openSync(testPath, "w");
  fs.writeSync(fd, "test file content");
  fs.closeSync(fd);

  const tfr = (await openSendFiles([testPath]))[0];

  expect(tfr.getName()).toBe("send.txt");
  expect(tfr.getSize()).toBe(17);

  let buf = new ArrayBuffer(4);
  expect(await tfr.readFile(buf)).toStrictEqual(strToUint8("test"));
  buf = new ArrayBuffer(1);
  expect(await tfr.readFile(buf)).toStrictEqual(strToUint8(" "));
  buf = new ArrayBuffer("file content".length);
  expect(await tfr.readFile(buf)).toStrictEqual(strToUint8("file content"));
  expect(await tfr.readFile(buf)).toStrictEqual(strToUint8(""));

  tfr.closeFile();
});

test("open send files error", async () => {
  await expect(openSendFiles([notExistFile])).rejects.toThrowError("no such file");

  const closeSync = fs.closeSync;
  fs.closeSync = jest.fn();
  await expect(openSendFiles([tmpFile, notExistFile])).rejects.toThrowError("no such file");
  expect(fs.closeSync.mock.calls.length).toBe(1);
  fs.closeSync = closeSync;
});

test("open save file", async () => {
  let tfr = await openSaveFile(tmpDir, "save.txt", false);
  expect(tfr.getName()).toBe("save.txt");
  tfr.closeFile();

  tfr = await openSaveFile(tmpDir, "save.txt", false);
  expect(tfr.getName()).toBe("save.txt.0");
  tfr.closeFile();

  tfr = await openSaveFile(tmpDir, "save.txt", true);
  expect(tfr.getName()).toBe("save.txt");
  await tfr.writeFile(strToUint8("test "));
  await tfr.writeFile(strToUint8("file content"));
  tfr.closeFile();
  expect(fs.readFileSync(path.join(tmpDir, "save.txt")).toString()).toBe("test file content");

  const existsSync = fs.existsSync;
  fs.existsSync = jest.fn();
  fs.existsSync.mockReturnValue(true);
  await expect(openSaveFile(tmpDir, "save.txt", false)).rejects.toThrowError("Fail to assign new file name");
  fs.existsSync = existsSync;
});

test("open save file error", async () => {
  fs.chmodSync(tmpDir, 0o444);
  await expect(openSaveFile(tmpDir, "error.txt", false)).rejects.toThrowError("No permission to write");
  fs.chmodSync(tmpDir, 0o777);

  fs.mkdirSync(path.join(tmpDir, "isdir"));
  await expect(openSaveFile(tmpDir, "isdir", true)).rejects.toThrowError("Is a directory");

  const openSync = fs.openSync;
  fs.openSync = jest.fn();
  fs.openSync.mockImplementation(() => {
    throw new Error("other error");
  });
  await expect(openSaveFile(tmpDir, "other.txt", false)).rejects.toThrowError("other error");
  fs.openSync = openSync;
});
