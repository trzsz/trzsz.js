/**
 * trzsz: https://github.com/trzsz/trzsz.js
 * Copyright(c) 2022 Lonny Wong <lonnywong@qq.com>
 * @license MIT
 */

import { strToUint8 } from "../src/comm";
import { encodeBuffer, decodeBuffer } from "../src/transfer";

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
