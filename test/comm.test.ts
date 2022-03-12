/**
 * trzsz: https://github.com/trzsz/trzsz.js
 * Copyright(c) 2022 Lonny Wong <lonnywong@qq.com>
 * @license MIT
 */

import { strToUint8, encodeBuffer, decodeBuffer, TrzszError } from "../src/comm";

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

test("trzsz error remote exit", () => {
  const te = new TrzszError("eJwLLskvKEhNAQALbQLg", "EXIT");
  expect(te.isTraceBack()).toBe(false);
  expect(te.isRemoteExit()).toBe(true);
  expect(te.isRemoteFail()).toBe(false);
  expect(TrzszError.getErrorMessage(te)).toBe("Stopped");
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
