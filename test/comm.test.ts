/**
 * trzsz: https://github.com/trzsz/trzsz.js
 * Copyright(c) 2022 Lonny Wong <lonnywong@qq.com>
 * @license MIT
 */

import { TextDecoder } from "util";
// @ts-ignore
global.TextDecoder = TextDecoder;

import {
  strToUint8,
  strToArrBuf,
  uint8ToStr,
  encodeBuffer,
  decodeBuffer,
  checkDuplicateNames,
  isArrayOfType,
  stripServerOutput,
  TrzszError,
  formatSavedFiles,
  stripTmuxStatusLine,
} from "../src/comm";

test("zlib and base64 encode buffer", () => {
  expect(encodeBuffer("abc")).toBe("eJxLTEoGAAJNASc=");
  expect(encodeBuffer("ABCDE")).toBe("eJxzdHJ2cQUAA+gBUA==");
  expect(encodeBuffer(strToUint8(""))).toBe("eJwDAAAAAAE=");
  expect(encodeBuffer(strToUint8("1"))).toBe("eJwzBAAAMgAy");
});

test("base64 and zlib decode buffer", () => {
  expect(decodeBuffer("eJxLTEoGAAJNASc=")).toStrictEqual(strToUint8("abc"));
  expect(decodeBuffer("eJxzdHJ2cQUAA+gBUA==")).toStrictEqual(strToUint8("ABCDE"));
  expect(decodeBuffer("eJwDAAAAAAE=")).toStrictEqual(strToUint8(""));
  expect(decodeBuffer("eJwzBAAAMgAy")).toStrictEqual(strToUint8("1"));
});

test("string and Uint8Array transform", async () => {
  const str1 = "\x00\x01\xFF\xFE\xEE\xDD\xCC\xBB\xAA";
  const str2 = "\xAB\xCD\xEF\xFE\xDC\xBA\x80\x81\x82\x83\x84";
  expect(await uint8ToStr(strToUint8(str1))).toBe(str1);
  expect(await uint8ToStr(strToUint8(str2))).toBe(str2);
  expect(await uint8ToStr(strToUint8("\xE4\xB8\xAD\xE6\x96\x87UTF8"), "utf8")).toBe("中文UTF8");
  const buffer = global.Buffer;
  // @ts-ignore
  global.Buffer = undefined;
  try {
    expect(await uint8ToStr(strToUint8(str1))).toBe(str1);
    expect(await uint8ToStr(strToUint8(str2))).toBe(str2);
    expect(await uint8ToStr(strToUint8("\xE4\xB8\xAD\xE6\x96\x87UTF8"), "utf8")).toBe("中文UTF8");
  } finally {
    global.Buffer = buffer;
  }
});

test("trzsz error remote exit", () => {
  const te = new TrzszError("eJwLLskvKEhNedo459naRQArrgcX", "EXIT");
  expect(te.isTraceBack()).toBe(false);
  expect(te.isRemoteExit()).toBe(true);
  expect(te.isRemoteFail()).toBe(false);
  expect(TrzszError.getErrorMessage(te)).toBe("Stopped停止");
});

test("trzsz error remote fail and trace back", () => {
  const te = new TrzszError("eJxLS8zMUchNLS5OTE8FAB2fBKI=", "FAIL", true);
  expect(te.isTraceBack()).toBe(true);
  expect(te.isRemoteExit()).toBe(false);
  expect(te.isRemoteFail()).toBe(true);
  expect(TrzszError.getErrorMessage(te)).toContain(" at ");
  expect(TrzszError.getErrorMessage(te)).toContain("fail message");
  expect(TrzszError.getErrorMessage(te)).not.toContain("TrzszError");
});

test("trzsz error remote fail and no trace", () => {
  const te = new TrzszError("eJxLS8zMUchNLS5OTE8FAB2fBKI=", "fail", true);
  expect(te.isTraceBack()).toBe(false);
  expect(te.isRemoteExit()).toBe(false);
  expect(te.isRemoteFail()).toBe(true);
  expect(TrzszError.getErrorMessage(te)).toBe("fail message");
});

test("trzsz error message decode fail", () => {
  const te = new TrzszError("fail message", "fail", true);
  expect(te.isTraceBack()).toBe(false);
  expect(te.isRemoteExit()).toBe(false);
  expect(te.isRemoteFail()).toBe(true);
  expect(TrzszError.getErrorMessage(te)).toContain("error");
  expect(TrzszError.getErrorMessage(te)).toContain("fail message");
  expect(TrzszError.getErrorMessage(te)).not.toContain("undefined");
});

test("trzsz error other type", () => {
  const te = new TrzszError("fail message", "other", true);
  expect(te.isTraceBack()).toBe(true);
  expect(te.isRemoteExit()).toBe(false);
  expect(te.isRemoteFail()).toBe(false);
  expect(TrzszError.getErrorMessage(te)).toContain("other");
  expect(TrzszError.getErrorMessage(te)).toContain("[TrzszError]");
  expect(TrzszError.getErrorMessage(te)).toContain("fail message");
});

test("trzsz error no stack", () => {
  const err = new Error("fail message");
  err.stack = undefined;
  expect(TrzszError.getErrorMessage(err)).toContain("fail message");
});

test("check duplicate names", () => {
  const file = {
    getPathId: () => 0,
    getRelPath: () => ["a", "b", "c"],
    isDir: () => true,
    getSize: () => 0,
    readFile: jest.fn(),
    closeFile: jest.fn(),
  };
  expect(() => checkDuplicateNames([file])).not.toThrow("Duplicate name");
  expect(() => checkDuplicateNames([file, file])).toThrow("Duplicate name");
});

test("is array of string", () => {
  expect(isArrayOfType([], "string")).toBe(true);
  expect(isArrayOfType(["a"], "string")).toBe(true);
  expect(isArrayOfType(["a", "b", "c"], "string")).toBe(true);
  expect(isArrayOfType("a", "string")).toBe(false);
  expect(isArrayOfType(["a", 1], "string")).toBe(false);
});

test("strip server output", () => {
  function testStripServerOutput(output: string, result: string | null) {
    expect(stripServerOutput(output)).toBe(result);
    expect(stripServerOutput(strToUint8(output))).toBe(result);
    expect(stripServerOutput(strToArrBuf(output))).toBe(result);
  }

  testStripServerOutput("", "");
  testStripServerOutput("trz\r\n", "trz");
  testStripServerOutput("trz -d\r\n", "trz -d");
  testStripServerOutput("\x1b[29Ctrz\x1b[01;34m\r\n", "trz");
  testStripServerOutput("\x1b[29Ctrz\x1b[01;34m -d\r\n", "trz -d");

  testStripServerOutput("trz\r\n\u001b[?2004l\r", "trz");

  testStripServerOutput("\x08trz ", "\x08trz ");

  const b = new Blob(["test"]);
  expect(stripServerOutput(b)).toBe(b);

  expect(() => stripServerOutput("A".repeat(200000))).not.toThrow();
});

test("format saved files", () => {
  expect(formatSavedFiles(["a.txt"], "/tmp")).toBe("Saved 1 file/directory to /tmp\r\n- a.txt");
  expect(formatSavedFiles(["a.txt", "b.txt"], ".")).toBe("Saved 2 files/directories to .\r\n- a.txt\r\n- b.txt");
  expect(formatSavedFiles(["a.txt", "b.txt"], "")).toBe("Saved 2 files/directories\r\n- a.txt\r\n- b.txt");
});

test("strip tmux status line", () => {
  const P = "\x1bP=1s\x1b\\\x1b[?25l\x1b[?12l\x1b[?25h\x1b[5 q\x1bP=2s\x1b\\";
  expect(stripTmuxStatusLine("")).toBe("");
  expect(stripTmuxStatusLine("ABC" + "123")).toBe("ABC123");
  expect(stripTmuxStatusLine("ABC" + P + "123")).toBe("ABC123");
  expect(stripTmuxStatusLine("ABC" + P + "123" + P + "XYZ")).toBe("ABC123XYZ");
  expect(stripTmuxStatusLine("ABC" + P + "123" + P + P + P + "XYZ")).toBe("ABC123XYZ");
  for (let i = 0; i < P.length - 2; i++) {
    expect(stripTmuxStatusLine("ABC" + P + "123" + P.substring(0, P.length - i))).toBe("ABC123");
  }
});
