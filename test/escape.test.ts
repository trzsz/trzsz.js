/**
 * trzsz: https://github.com/trzsz/trzsz.js
 * Copyright(c) 2022 Lonny Wong <lonnywong@qq.com>
 * @license MIT
 */

import { strToUint8 } from "../src/comm";
import { getEscapeChars, escapeCharsToCodes, escapeData, unescapeData } from "../src/escape";

/* eslint-disable require-jsdoc */

test("the escape chars", () => {
  const defaultEscapeChars = getEscapeChars(false);
  const allEscapeChars = getEscapeChars(true);
  expect(allEscapeChars.length).toBeGreaterThan(defaultEscapeChars.length);
  for (let i = 0; i < defaultEscapeChars.length; i++) {
    expect(defaultEscapeChars[i].length).toBe(2);
    expect(defaultEscapeChars[i][0].length).toBe(1);
    expect(defaultEscapeChars[i][1].length).toBe(2);
  }
  for (let i = 0; i < allEscapeChars.length; i++) {
    expect(allEscapeChars[i].length).toBe(2);
    expect(allEscapeChars[i][0].length).toBe(1);
    expect(allEscapeChars[i][1].length).toBe(2);
  }
});

test("escape chars to codes", () => {
  const escapeChars = getEscapeChars(true);
  const escapeCodes = escapeCharsToCodes(escapeChars);
  expect(escapeCodes.length).toBe(escapeChars.length);
  for (let i = 0; i < escapeChars.length; i++) {
    expect(escapeChars[i].length).toBe(2);
    expect(escapeChars[i][0].length).toBe(1);
    expect(escapeChars[i][1].length).toBe(2);
    expect(escapeChars[i][0][0].charCodeAt(0)).toBe(escapeCodes[i][0]);
    expect(escapeChars[i][1][0].charCodeAt(0)).toBe(escapeCodes[i][1]);
    expect(escapeChars[i][1][1].charCodeAt(0)).toBe(escapeCodes[i][2]);
  }
});

test("escape data", () => {
  const escapeChars = getEscapeChars(true);
  const escapeCodes = escapeCharsToCodes(escapeChars);
  const data = strToUint8("\xee\x7e\x02\x0d\x10\x11\x13\x18\x1b\x1d\x8d\x90\x91\x93\x9dA");
  expect(escapeData(data, [])).toStrictEqual(
    strToUint8("\xee\x7e\x02\x0d\x10\x11\x13\x18\x1b\x1d\x8d\x90\x91\x93\x9dA"),
  );
  expect(escapeData(data, escapeCodes)).toStrictEqual(
    strToUint8("\xee\xee\xee1\xeeA\xeeB\xeeC\xeeD\xeeE\xeeF\xeeG\xeeH\xeeI\xeeJ\xeeK\xeeL\xeeMA"),
  );
});

test("unescape data", () => {
  const escapeChars = getEscapeChars(true);
  const escapeCodes = escapeCharsToCodes(escapeChars);
  const data = strToUint8("\xee\xee\xee1\xeeA\xeeB\xeeC\xeeD\xeeE\xeeF\xeeG\xeeH\xeeI\xeeJ\xeeK\xeeL\xeeMA");
  expect(unescapeData(data, [])).toStrictEqual(
    strToUint8("\xee\xee\xee1\xeeA\xeeB\xeeC\xeeD\xeeE\xeeF\xeeG\xeeH\xeeI\xeeJ\xeeK\xeeL\xeeMA"),
  );
  expect(unescapeData(data, escapeCodes)).toStrictEqual(
    strToUint8("\xee\x7e\x02\x0d\x10\x11\x13\x18\x1b\x1d\x8d\x90\x91\x93\x9dA"),
  );
});
