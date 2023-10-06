/**
 * trzsz: https://github.com/trzsz/trzsz.js
 * Copyright(c) 2022 Lonny Wong <lonnywong@qq.com>
 * @license MIT
 */

/* eslint-disable require-jsdoc */

export function getEscapeChars(escapeAll: boolean): Array<string[]> {
  const escapeChars = [
    ["\xee", "\xee\xee"],
    ["\x7e", "\xee\x31"],
  ];
  if (escapeAll) {
    const chars = "\x02\x0d\x10\x11\x13\x18\x1b\x1d\x8d\x90\x91\x93\x9d";
    for (let i = 0; i < chars.length; i++) {
      escapeChars.push([chars[i], "\xee" + String.fromCharCode(0x41 + i)]);
    }
  }
  return escapeChars;
}

export function escapeCharsToCodes(escapeChars: Array<string[]>): Array<number[]> {
  const escapeCodes = [];
  for (let i = 0; i < escapeChars.length; i++) {
    escapeCodes.push([
      escapeChars[i][0].charCodeAt(0),
      escapeChars[i][1].charCodeAt(0),
      escapeChars[i][1].charCodeAt(1),
    ]);
  }
  return escapeCodes;
}

export function escapeData(data: Uint8Array, escapeCodes: Array<number[]>): Uint8Array {
  if (!escapeCodes.length) {
    return data;
  }

  const buf = new Uint8Array(data.length * 2);

  let idx = 0;
  for (let i = 0; i < data.length; i++) {
    let escapeIdx = -1;
    for (let j = 0; j < escapeCodes.length; j++) {
      if (data[i] == escapeCodes[j][0]) {
        escapeIdx = j;
        break;
      }
    }
    if (escapeIdx < 0) {
      buf[idx++] = data[i];
    } else {
      buf[idx++] = escapeCodes[escapeIdx][1];
      buf[idx++] = escapeCodes[escapeIdx][2];
    }
  }

  return buf.subarray(0, idx);
}

export function unescapeData(data: Uint8Array, escapeCodes: Array<number[]>): Uint8Array {
  if (!escapeCodes.length) {
    return data;
  }

  const buf = new Uint8Array(data.length);

  let idx = 0;
  for (let i = 0; i < data.length; i++) {
    let escapeIdx = -1;
    if (i < data.length - 1) {
      for (let j = 0; j < escapeCodes.length; j++) {
        if (data[i] == escapeCodes[j][1] && data[i + 1] == escapeCodes[j][2]) {
          escapeIdx = j;
          break;
        }
      }
    }
    if (escapeIdx < 0) {
      buf[idx++] = data[i];
    } else {
      buf[idx++] = escapeCodes[escapeIdx][0];
      i++;
    }
  }

  return buf.subarray(0, idx);
}
