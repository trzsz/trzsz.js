/**
 * trzsz: https://github.com/trzsz/trzsz.js
 * Copyright(c) 2022 Lonny Wong <lonnywong@qq.com>
 * @license MIT
 */

const os = require("os");
const fs = require("fs");
const path = require("path");
import { strToUint8 } from "../src/comm";
import { checkPathWritable, checkPathsReadable, openSaveFile } from "../src/nodefs";

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

test("check paths readable", () => {
  expect(checkPathsReadable(undefined)).toBe(undefined);
  expect(checkPathsReadable([])).toBe(undefined);

  fs.chmodSync(tmpFile, 0o444);
  expect(checkPathsReadable([tmpFile]).length).toBe(1);
  expect(checkPathsReadable([linkPath]).length).toBe(1);

  expect(() => checkPathsReadable([notExistFile])).toThrowError("No such file");
  expect(() => checkPathsReadable([tmpFile, notExistFile])).toThrowError("No such file");

  expect(() => checkPathsReadable([tmpDir])).toThrowError("Is a directory");
  expect(() => checkPathsReadable([tmpFile, tmpDir])).toThrowError("Is a directory");

  if (process.platform !== "win32") {
    expect(() => checkPathsReadable(["/dev/stdin"])).toThrowError("Not a regular file");
    expect(() => checkPathsReadable([tmpFile, "/dev/stdin"])).toThrowError("Not a regular file");

    fs.chmodSync(tmpFile, 0o222);
    expect(() => checkPathsReadable([tmpFile])).toThrowError("No permission to read");
    fs.chmodSync(tmpFile, 0o444);
  }
});

test("check path writable", () => {
  expect(checkPathWritable(undefined)).toBe(false);
  expect(checkPathWritable(null)).toBe(false);

  fs.chmodSync(tmpDir, 0o777);
  expect(checkPathWritable(tmpDir)).toBe(true);

  expect(() => checkPathWritable(notExistFile)).toThrowError("No such directory");
  expect(() => checkPathWritable(tmpFile)).toThrowError("Not a directory");

  if (process.platform !== "win32") {
    fs.chmodSync(tmpDir, 0o444);
    expect(() => checkPathWritable(tmpDir)).toThrowError("No permission to write");
    fs.chmodSync(tmpDir, 0o777);
  }
});

test("open send files success", async () => {
  const testPath = path.join(tmpDir, "send.txt");
  const fd = fs.openSync(testPath, "w");
  fs.writeSync(fd, "test file content");
  fs.closeSync(fd);

  const tfr = checkPathsReadable([testPath])[0];

  expect(tfr.getPathId()).toBe(0);
  expect(tfr.getRelPath()).toStrictEqual(["send.txt"]);
  expect(tfr.isDir()).toBe(false);
  expect(tfr.getSize()).toBe(17);

  let buf = new ArrayBuffer(4);
  expect(await tfr.readFile(buf)).toStrictEqual(strToUint8("test"));
  buf = new ArrayBuffer(1);
  expect(await tfr.readFile(buf)).toStrictEqual(strToUint8(" "));
  buf = new ArrayBuffer("file content".length);
  expect(await tfr.readFile(buf)).toStrictEqual(strToUint8("file content"));
  expect(await tfr.readFile(buf)).toStrictEqual(strToUint8(""));

  tfr.closeFile();
  await expect(tfr.readFile(buf)).rejects.toThrowError("File closed");
});

test("open send files error", async () => {
  expect(() => checkPathsReadable([notExistFile])).toThrowError("No such file");
  expect(() => checkPathsReadable([tmpFile, notExistFile])).toThrowError("No such file");
});

test("open save file success", async () => {
  const saveParam = { path: tmpDir, maps: new Map<string, string>() };
  let tfr = await openSaveFile(saveParam, "save.txt", false, false);
  expect(tfr.getFileName()).toBe("save.txt");
  expect(tfr.getLocalName()).toBe("save.txt");
  expect(tfr.isDir()).toBe(false);
  tfr.closeFile();

  tfr = await openSaveFile(saveParam, "save.txt", false, false);
  expect(tfr.getFileName()).toBe("save.txt");
  expect(tfr.getLocalName()).toBe("save.txt.0");
  expect(tfr.isDir()).toBe(false);
  tfr.closeFile();

  tfr = await openSaveFile(saveParam, "save.txt", false, true);
  expect(tfr.getFileName()).toBe("save.txt");
  expect(tfr.getLocalName()).toBe("save.txt");
  expect(tfr.isDir()).toBe(false);
  await tfr.writeFile(strToUint8("test "));
  await tfr.writeFile(strToUint8("file content"));
  tfr.closeFile();
  expect(fs.readFileSync(path.join(tmpDir, "save.txt")).toString()).toBe("test file content");

  const existsSync = fs.existsSync;
  fs.existsSync = jest.fn();
  fs.existsSync.mockReturnValue(true);
  await expect(openSaveFile(saveParam, "save.txt", false, false)).rejects.toThrowError("Fail to assign new file name");
  fs.existsSync = existsSync;
});

test("open save file error", async () => {
  const saveParam = { path: tmpDir, maps: new Map<string, string>() };
  if (process.platform !== "win32") {
    fs.chmodSync(tmpDir, 0o444);
    await expect(openSaveFile(saveParam, "error.txt", false, false)).rejects.toThrowError("No permission to write");
    fs.chmodSync(tmpDir, 0o777);
  }

  fs.mkdirSync(path.join(tmpDir, "isdir"));
  await expect(openSaveFile(saveParam, "isdir", false, true)).rejects.toThrowError("Is a directory");

  const openSync = fs.openSync;
  fs.openSync = jest.fn();
  fs.openSync.mockImplementation(() => {
    throw new Error("other error");
  });
  await expect(openSaveFile(saveParam, "other.txt", false, false)).rejects.toThrowError("other error");
  fs.openSync = openSync;
});

test("open directory success", async () => {
  const testDir = path.join(tmpDir, "testdir");
  fs.mkdirSync(testDir);
  const testPath = path.join(testDir, "send.txt");
  const fd = fs.openSync(testPath, "w");
  fs.writeSync(fd, "test file content");
  fs.closeSync(fd);

  const fileList = checkPathsReadable([testDir], true);
  expect(fileList[0].getPathId()).toBe(0);
  expect(fileList[0].getRelPath()).toStrictEqual(["testdir"]);
  expect(fileList[0].isDir()).toBe(true);
  expect(fileList[0].getSize()).toBe(0);

  expect(fileList[1].getPathId()).toBe(0);
  expect(fileList[1].getRelPath()).toStrictEqual(["testdir", "send.txt"]);
  expect(fileList[1].isDir()).toBe(false);
  expect(fileList[1].getSize()).toBe(17);

  let buf = new ArrayBuffer(4);
  expect(await fileList[1].readFile(buf)).toStrictEqual(strToUint8("test"));
  buf = new ArrayBuffer(1);
  expect(await fileList[1].readFile(buf)).toStrictEqual(strToUint8(" "));
  buf = new ArrayBuffer("file content".length);
  expect(await fileList[1].readFile(buf)).toStrictEqual(strToUint8("file content"));
  expect(await fileList[1].readFile(buf)).toStrictEqual(strToUint8(""));

  fileList[1].closeFile();
  await expect(fileList[1].readFile(buf)).rejects.toThrowError("File closed");
});

test("open directory error", async () => {
  const testDir = path.join(tmpDir, "errdir");
  fs.mkdirSync(testDir);
  if (process.platform !== "win32") {
    const linkDir = path.join(testDir, "link");
    fs.symlinkSync(testDir, linkDir);
    expect(() => checkPathsReadable([testDir], true)).toThrowError("Duplicate link");
  }
});

test("save directory success", async () => {
  const testDir = path.join(tmpDir, "savedir");
  fs.mkdirSync(testDir);
  const fileName = {
    path_id: 0,
    path_name: ["a"],
    is_dir: true,
  };

  const saveParam = { path: testDir, maps: new Map<string, string>() };
  expect(fs.existsSync(path.join(testDir, "a"))).toBe(false);
  let file = await openSaveFile(saveParam, JSON.stringify(fileName), true, false);
  expect(file.getFileName()).toBe("a");
  expect(file.getLocalName()).toBe("a");
  expect(file.isDir()).toBe(true);
  file.closeFile();
  expect(fs.existsSync(path.join(testDir, "a"))).toBe(true);

  fileName.path_id = 1;
  expect(fs.existsSync(path.join(testDir, "a.0"))).toBe(false);
  file = await openSaveFile(saveParam, JSON.stringify(fileName), true, false);
  expect(file.getFileName()).toBe("a");
  expect(file.getLocalName()).toBe("a.0");
  expect(file.isDir()).toBe(true);
  file.closeFile();
  expect(fs.existsSync(path.join(testDir, "a.0"))).toBe(true);

  fileName.path_id = 2;
  file = await openSaveFile(saveParam, JSON.stringify(fileName), true, true);
  expect(file.getFileName()).toBe("a");
  expect(file.getLocalName()).toBe("a");
  expect(file.isDir()).toBe(true);
  file.closeFile();
  expect(fs.existsSync(path.join(testDir, "a"))).toBe(true);

  fileName.path_id = 0;
  fileName.path_name = ["a", "b"];
  expect(fs.existsSync(path.join(testDir, "a/b"))).toBe(false);
  file = await openSaveFile(saveParam, JSON.stringify(fileName), true, false);
  expect(file.getFileName()).toBe("b");
  expect(file.getLocalName()).toBe("a");
  expect(file.isDir()).toBe(true);
  file.closeFile();
  expect(fs.existsSync(path.join(testDir, "a/b"))).toBe(true);

  fileName.path_id = 0;
  fileName.path_name = ["a", "b", "c"];
  fileName.is_dir = false;
  expect(fs.existsSync(path.join(testDir, "a/b/c"))).toBe(false);
  file = await openSaveFile(saveParam, JSON.stringify(fileName), true, false);
  expect(file.getFileName()).toBe("c");
  expect(file.getLocalName()).toBe("a");
  expect(file.isDir()).toBe(false);
  file.closeFile();
  expect(fs.existsSync(path.join(testDir, "a/b/c"))).toBe(true);
  expect(fs.statSync(path.join(testDir, "a/b/c")).isFile()).toBe(true);
});

test("save directory error", async () => {
  const testDir = path.join(tmpDir, "direrror");
  fs.mkdirSync(testDir);
  const testFile = path.join(testDir, "a");
  fs.closeSync(fs.openSync(testFile, "w"));

  const fileName = {
    path_id: 0,
    path_name: ["a"],
    is_dir: true,
  };
  const saveParam = { path: testDir, maps: new Map<string, string>() };
  await expect(openSaveFile(saveParam, JSON.stringify(fileName), true, true)).rejects.toThrowError("Not a directory");

  fileName.path_name = [];
  await expect(openSaveFile(saveParam, JSON.stringify(fileName), true, true)).rejects.toThrowError("Invalid name");

  delete fileName.is_dir;
  fileName.path_name = ["b"];
  await expect(openSaveFile(saveParam, JSON.stringify(fileName), true, true)).rejects.toThrowError("Invalid name");
});
