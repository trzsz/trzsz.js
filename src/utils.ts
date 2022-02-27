/**
 * trzsz: https://github.com/trzsz/trzsz.js
 * Copyright(c) 2022 Lonny Wong <lonnywong@qq.com>
 * @license MIT
 */

import { deflate, inflate } from "pako";

/**
 * trzsz version injected by rollup-plugin-version-injector
 */
export const trzszVersion = "[VersionInject]{version}[/VersionInject]";

/* eslint-disable require-jsdoc */

export type TrzszWriter = (data: string | Uint8Array) => void;

function encodeBuffer(buf: string | Uint8Array): string {
  return btoa(String.fromCharCode.apply(null, deflate(buf)));
}

function decodeBuffer(buf: string): Uint8Array {
  return inflate(Uint8Array.from(atob(buf), (v) => v.charCodeAt(0)));
}

export async function sendLine(typ: string, buf: string, writer: TrzszWriter) {
  writer(`#${typ}:${buf}\n`);
}

export async function sendString(typ: string, buf: string, writer: TrzszWriter) {
  await sendLine(typ, encodeBuffer(buf), writer);
}

export async function sendAction(confirm: boolean, writer: TrzszWriter) {
  const action = { lang: "js", confirm: confirm, version: trzszVersion };
  await sendString("ACT", JSON.stringify(action), writer);
}
