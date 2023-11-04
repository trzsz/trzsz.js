/**
 * trzsz: https://github.com/trzsz/trzsz.js
 * Copyright(c) 2022 Lonny Wong <lonnywong@qq.com>
 * @license MIT
 */

import Pako from "pako";
import * as Base64 from "base64-js";

/**
 * trzsz version injected by rollup-plugin-version-injector
 */
export const trzszVersion = "[VersionInject]{version}[/VersionInject]";

/* eslint-disable require-jsdoc */

export const isRunningInWindows = (function () {
  try {
    return process.platform === "win32";
  } catch (err) {
    return false;
  }
})();

export const isRunningInBrowser = (function () {
  try {
    if (require.resolve("fs") === "fs") {
      require("fs");
      return false;
    }
  } catch (err) {}
  return true;
})();

export function strToUint8(str: string): Uint8Array {
  return Uint8Array.from(str, (v) => v.charCodeAt(0));
}

export async function uint8ToStr(buf: Uint8Array, encoding: BufferEncoding = "binary"): Promise<string> {
  if (typeof Buffer === "function") {
    return Buffer.from(buf).toString(encoding);
  }
  return new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    if (encoding == "binary") {
      reader.readAsBinaryString(new Blob([buf]));
    } else {
      reader.readAsText(new Blob([buf]), encoding);
    }
  });
}

export function strToArrBuf(str: string): ArrayBuffer {
  return strToUint8(str).buffer;
}

const _hasBuffer = typeof Buffer === "function";

export function encodeBuffer(buf: string | Uint8Array): string {
  const buffer = Pako.deflate(buf);
  if (_hasBuffer) {
    return Buffer.from(buffer).toString("base64");
  }
  return Base64.fromByteArray(buffer);
}

export function decodeBuffer(buf: string): Uint8Array {
  let buffer: Uint8Array;
  if (_hasBuffer) {
    buffer = Buffer.from(buf, "base64");
  } else {
    buffer = Base64.toByteArray(buf);
  }
  return Pako.inflate(buffer);
}

export class TrzszError extends Error {
  private readonly type: string | null;
  private readonly trace: boolean;

  constructor(message: string, type: string | null = null, trace: boolean = false) {
    if (type === "fail" || type === "FAIL" || type === "EXIT") {
      try {
        message = new TextDecoder().decode(decodeBuffer(message));
      } catch (err) {
        message = `decode [${message}] error: ${err}`;
      }
    } else if (type) {
      message = `[TrzszError] ${type}: ${message}`;
    }

    super(message);
    Object.setPrototypeOf(this, TrzszError.prototype);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, TrzszError);
    }

    this.name = "TrzszError";
    this.type = type;
    this.trace = trace;
  }

  public isTraceBack() {
    if (this.type === "fail" || this.type === "EXIT") {
      return false;
    }
    return this.trace;
  }

  public isRemoteExit() {
    return this.type === "EXIT";
  }

  public isRemoteFail() {
    return this.type === "fail" || this.type === "FAIL";
  }

  public isStopAndDelete() {
    if (this.type !== "fail") {
      return false;
    }
    return this.message === "Stopped and deleted";
  }

  public static getErrorMessage(err: Error) {
    if (err instanceof TrzszError && !err.isTraceBack()) {
      return err.message;
    }
    if (err.stack) {
      return err.stack.replace("TrzszError: ", "");
    }
    return err.toString();
  }
}

export interface TrzszFile {
  closeFile: () => void;
}

export interface TrzszFileReader extends TrzszFile {
  getPathId: () => number;
  getRelPath: () => string[];
  isDir: () => boolean;
  getSize: () => number;
  readFile: (buf: ArrayBuffer) => Promise<Uint8Array>;
}

export interface TrzszFileWriter extends TrzszFile {
  getFileName: () => string;
  getLocalName: () => string;
  isDir: () => boolean;
  writeFile: (buf: Uint8Array) => Promise<void>;
  deleteFile: () => Promise<string>;
}

export type OpenSaveFile = (
  saveParam: any,
  fileName: string,
  directory: boolean,
  overwrite: boolean,
) => Promise<TrzszFileWriter>;

export interface ProgressCallback {
  onNum: (num: number) => void;
  onName: (name: string) => void;
  onSize: (size: number) => void;
  onStep: (step: number) => void;
  onDone: () => void;
}

export function checkDuplicateNames(files: TrzszFileReader[]) {
  const names = new Set();
  for (const file of files) {
    const path = file.getRelPath().join("/");
    if (names.has(path)) {
      throw new TrzszError(`Duplicate name: ${path}`);
    }
    names.add(path);
  }
}

export function isArrayOfType(arr: any, type: string) {
  if (!Array.isArray(arr)) {
    return false;
  }
  for (const a of arr) {
    if (typeof a !== type) {
      return false;
    }
  }
  return true;
}

export function isVT100End(c: number): boolean {
  if (0x61 <= c && c <= 0x7a) {
    // 'a' <= c && c <= 'z'
    return true;
  }
  if (0x41 <= c && c <= 0x5a) {
    // 'A' <= c && c <= 'Z'
    return true;
  }
  return false;
}

export function stripServerOutput(output: string | ArrayBuffer | Uint8Array | Blob) {
  let uint8: Uint8Array;
  if (typeof output === "string") {
    uint8 = strToUint8(output);
  } else if (output instanceof ArrayBuffer) {
    uint8 = new Uint8Array(output);
  } else if (output instanceof Uint8Array) {
    uint8 = output;
  } else {
    return output;
  }
  const buf = new Uint8Array(uint8.length);
  let skipVT100 = false;
  let idx = 0;
  for (let i = 0; i < uint8.length; i++) {
    const c = uint8[i];
    if (skipVT100) {
      if (isVT100End(c)) {
        skipVT100 = false;
      }
    } else if (c == 0x1b) {
      skipVT100 = true;
    } else {
      buf[idx++] = c;
    }
  }
  while (idx > 0) {
    const c = buf[idx - 1];
    if (c != 0x0d && c != 0x0a) {
      // not \r\n
      break;
    }
    idx--;
  }
  const result = buf.subarray(0, idx);
  if (result.length > 100) {
    return output;
  }
  return String.fromCharCode.apply(null, result);
}

export const TmuxMode = {
  NoTmux: 0,
  TmuxNormalMode: 1,
  TmuxControlMode: 2,
};

export async function checkTmux() {
  const stdoutWriter = (data: string | Uint8Array) => process.stdout.write(data);
  if (!process.env.TMUX) {
    return [TmuxMode.NoTmux, stdoutWriter, -1];
  }

  const exec = require("util").promisify(require("child_process").exec);
  const out = await exec("tmux display-message -p '#{client_tty}:#{client_control_mode}:#{pane_width}'");
  const output = out.stdout.trim();
  const tokens = output.split(":");
  if (tokens.length != 3) {
    throw new TrzszError(`tmux unexpect output: ${output}`);
  }

  const fs = require("fs");
  const [tmuxTty, controlMode, paneWidth] = tokens;
  const tmuxPaneWidth = parseInt(paneWidth, 10);

  if (controlMode == "1" || !tmuxTty.startsWith("/") || !fs.existsSync(tmuxTty)) {
    return [TmuxMode.TmuxControlMode, stdoutWriter, tmuxPaneWidth];
  }

  const fd = fs.openSync(tmuxTty, "w");
  const tmuxRealWriter = (data: string | Uint8Array) => fs.writeSync(fd, data);

  const statusInterval = await getTmuxStatusInterval();
  await setTmuxStatusInterval("0");
  process.on("exit", async function () {
    await setTmuxStatusInterval(statusInterval);
  });

  return [TmuxMode.TmuxNormalMode, tmuxRealWriter, tmuxPaneWidth];
}

async function getTmuxStatusInterval() {
  const exec = require("util").promisify(require("child_process").exec);
  const out = await exec("tmux display-message -p '#{status-interval}'");
  const output = out.stdout.trim();
  if (!output) {
    return "15"; // The default is 15 seconds
  }
  return output;
}

async function setTmuxStatusInterval(interval: string) {
  if (!interval) {
    interval = "15"; // The default is 15 seconds
  }
  const exec = require("util").promisify(require("child_process").exec);
  await exec(`tmux setw status-interval ${interval}`);
}

export async function tmuxRefreshClient() {
  const exec = require("util").promisify(require("child_process").exec);
  await exec("tmux refresh-client");
}

export function getTerminalColumns() {
  return process.stdout.columns;
}

let originalTtyMode = "";
let changeStdinMode = false;

export async function setStdinRaw() {
  if (!process.stdin.isTTY) {
    return;
  }
  changeStdinMode = true;
  if (!isRunningInWindows) {
    const spawn = require("child_process").spawn;
    const child = spawn("stty", ["-g"], { stdio: ["inherit", "pipe", "pipe"] });
    child.stdout.on("data", (data: any) => {
      originalTtyMode += data.toString();
    });
    await new Promise((resolve) => child.on("exit", resolve));
    originalTtyMode = originalTtyMode.trim();

    await new Promise((resolve) => spawn("stty", ["raw"], { stdio: "inherit" }).on("exit", resolve));
  }
  process.stdin.setRawMode(true);
}

export async function resetStdinTty() {
  if (!changeStdinMode) {
    return;
  }
  process.stdin.setRawMode(false);
  if (originalTtyMode && originalTtyMode.length) {
    const child = require("child_process").spawn("stty", [originalTtyMode], { stdio: ["inherit", "pipe", "pipe"] });
    await new Promise((resolve) => child.on("exit", resolve));
  }
}

export function formatSavedFiles(fileNames: string[], destPath: string): string {
  let msg = `Saved ${fileNames.length} ${fileNames.length > 1 ? "files/directories" : "file/directory"}`;
  if (destPath.length > 0) {
    msg += ` to ${destPath}`;
  }
  return [msg].concat(fileNames).join("\r\n- ");
}

export function stripTmuxStatusLine(buf: string): string {
  while (true) {
    const beginIdx = buf.indexOf("\x1bP=");
    if (beginIdx < 0) {
      return buf;
    }
    let bufIdx = beginIdx + 3;
    const midIdx = buf.substring(bufIdx).indexOf("\x1bP=");
    if (midIdx < 0) {
      return buf.substring(0, beginIdx);
    }
    bufIdx += midIdx + 3;
    const endIdx = buf.substring(bufIdx).indexOf("\x1b\\");
    if (endIdx < 0) {
      return buf.substring(0, beginIdx);
    }
    bufIdx += endIdx + 2;
    buf = buf.substring(0, beginIdx) + buf.substring(bufIdx);
  }
}

export function setupConsoleOutput() {
  process.stdout.write("\x1b[?1049h\x1b[H\x1b[2J");
  const logo = [
    "ooooooooooooo      ooooooooo.         oooooooooooo       .oooooo..o       oooooooooooo",
    "8'   888   '8      `888   `Y88.      d'''''''d888'      d8P'    `Y8      d'''''''d888'",
    "     888            888   .d88'            .888P        Y88bo.                 .888P  ",
    "     888            888ooo88P'            d888'          `'Y8888o.            d888'   ",
    "     888            888`88b.            .888P                `'Y88b         .888P     ",
    "     888            888  `88b.         d888'    .P      oo     .d8P        d888'    .P",
    "    o888o          o888o  o888o      .888d888d88P       d888d88P'        .888d888d88P ",
  ];
  if (process.stdout.columns <= logo[0].length || process.stdout.rows <= logo.length + 2) {
    return;
  }
  const pad = Math.floor((process.stdout.columns - logo[0].length) / 2);
  for (const s of logo) {
    process.stdout.write(" ".repeat(pad) + s + "\r\n");
  }
}
