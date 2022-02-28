/**
 * trzsz: https://github.com/trzsz/trzsz.js
 * Copyright(c) 2022 Lonny Wong <lonnywong@qq.com>
 * @license MIT
 */

import * as Base64 from "base64-js";
import { deflate, inflate } from "pako";

/**
 * trzsz version injected by rollup-plugin-version-injector
 */
export const trzszVersion = "[VersionInject]{version}[/VersionInject]";

/* eslint-disable require-jsdoc */

const trzszMagicKey = "::TRZSZ:TRANSFER:";
const trzszMagicUint64 = new BigUint64Array(Uint8Array.from(trzszMagicKey, (v) => v.charCodeAt(0)).buffer, 0, 2);

export async function findTrzszMagicKey(output: string | ArrayBuffer | Blob) {
  if (typeof output === "string") {
    const idx = output.indexOf(trzszMagicKey);
    return idx < 0 ? null : output.substring(idx);
  }
  let uint8: Uint8Array;
  if (output instanceof ArrayBuffer) {
    uint8 = new Uint8Array(output);
  } else if (output instanceof Blob) {
    uint8 = new Uint8Array(await output.arrayBuffer());
  } else {
    return null;
  }
  const idx = uint8.indexOf(0x3a); // the index of first `:`
  if (idx < 0 || uint8.length - idx < 16) {
    return null;
  }
  const uint64 = new BigUint64Array(uint8.buffer.slice(idx, idx + 16));
  if (uint64[0] != trzszMagicUint64[0] || uint64[1] != trzszMagicUint64[1]) {
    return null;
  }
  return String.fromCharCode.apply(null, uint8.subarray(idx));
}

export type TrzszWriter = (data: string | Uint8Array) => void;

export function encodeBuffer(buf: string | Uint8Array): string {
  return Base64.fromByteArray(deflate(buf));
}

export function decodeBuffer(buf: string): Uint8Array {
  return inflate(Base64.toByteArray(buf));
}

export async function cleanInput(timeoutMilliseconds: number) {
  // TODO wait until no server output
}

export async function sendLine(typ: string, buf: string, writer: TrzszWriter) {
  writer(`#${typ}:${buf}\n`);
}

export async function sendString(typ: string, buf: string, writer: TrzszWriter) {
  await sendLine(typ, encodeBuffer(buf), writer);
}

export async function sendExit(msg: string, writer: TrzszWriter) {
  await cleanInput(200);
  await sendString("EXIT", msg, writer);
}

export async function sendAction(confirm: boolean, writer: TrzszWriter) {
  const action = { lang: "js", confirm: confirm, version: trzszVersion };
  await sendString("ACT", JSON.stringify(action), writer);
}
