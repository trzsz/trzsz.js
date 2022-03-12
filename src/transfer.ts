/**
 * trzsz: https://github.com/trzsz/trzsz.js
 * Copyright(c) 2022 Lonny Wong <lonnywong@qq.com>
 * @license MIT
 */

import { Md5 } from "ts-md5";
import { TrzszBuffer } from "./buffer";
import {
  uint8ToStr,
  encodeBuffer,
  decodeBuffer,
  TrzszError,
  TrzszFile,
  OpenSaveFile,
  TrzszFileReader,
  ProgressCallback,
} from "./comm";

/**
 * trzsz version injected by rollup-plugin-version-injector
 */
const trzszVersion = "[VersionInject]{version}[/VersionInject]";

/* eslint-disable require-jsdoc */

export function getEscapeChars(escapeAll: boolean): Array<string[]> {
  const escapeChars = [
    ["\xee", "\xee\xee"],
    ["\x7e", "\xee\x31"],
  ];
  if (escapeAll) {
    const chars = "\x02\x10\x1b\x1d\x9d";
    for (let i = 0; i < chars.length; i++) {
      escapeChars.push([chars[i], "\xee" + String.fromCharCode(0x41 + i)]);
    }
  }
  return escapeChars;
}

function escapeCharsToCodes(escapeChars: Array<string[]>): Array<number[]> {
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

function escapeData(data: Uint8Array, escapeCodes: Array<number[]>): Uint8Array {
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

function unescapeData(data: Uint8Array, escapeCodes: Array<number[]>): Uint8Array {
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

export class TrzszTransfer {
  private buffer: TrzszBuffer = new TrzszBuffer();
  private writer: (data: string | Uint8Array) => void;
  private lastInputTime: number = 0;
  private openedFiles: TrzszFile[] = [];
  private tmuxOutputJunk: boolean = false;
  private cleanTimeoutInMilliseconds: number = 100;
  private transferConfig: any = {};
  private stopped: boolean = false;

  public constructor(writer: (data: string | Uint8Array) => void) {
    this.writer = writer;
  }

  public cleanup() {
    for (const file of this.openedFiles) {
      file.closeFile();
    }
  }

  public addReceivedData(data: string | ArrayBuffer | Uint8Array | Blob) {
    this.buffer.addBuffer(data);
    this.lastInputTime = Date.now();
  }

  public async stopTransferring() {
    this.cleanTimeoutInMilliseconds = 500;
    this.stopped = true;
    this.buffer.stopBuffer();
  }

  private async cleanInput(timeoutInMilliseconds: number) {
    while (true) {
      const sleepTime = timeoutInMilliseconds - (Date.now() - this.lastInputTime);
      if (sleepTime <= 0) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, sleepTime));
    }
  }

  private async sendLine(typ: string, buf: string) {
    this.writer(`#${typ}:${buf}\n`);
  }

  private async recvLine(expectType: string, mayHasJunk: boolean = false) {
    if (this.stopped) {
      throw new TrzszError("Stopped");
    }

    let line = await this.buffer.readLine();

    if (this.tmuxOutputJunk || mayHasJunk) {
      if (line.length > 0) {
        while (line[line.length - 1] === "\r") {
          line += await this.buffer.readLine();
        }
      }
      const flag = "#" + expectType + ":";
      if (line.includes(flag)) {
        line = line.substring(line.lastIndexOf(flag));
      }
    }

    return line;
  }

  private async recvCheck(expectType: string, mayHasJunk: boolean = false) {
    const line = await this.recvLine(expectType, mayHasJunk);
    const idx = line.indexOf(":");
    if (idx < 1) {
      throw new TrzszError(line, null, true);
    }
    const typ = line.substring(1, idx);
    const buf = line.substring(idx + 1);
    if (typ != expectType) {
      throw new TrzszError(buf, typ, true);
    }
    return buf;
  }

  private async sendInteger(typ: string, val: number) {
    await this.sendLine(typ, val.toString());
  }

  private async recvInteger(typ: string, mayHasJunk: boolean = false) {
    const buf = await this.recvCheck(typ, mayHasJunk);
    return Number(buf);
  }

  private async checkInteger(expect: number) {
    const result = await this.recvInteger("SUCC");
    if (result !== expect) {
      throw new TrzszError(`[${result}] <> [${expect}]`, null, true);
    }
  }

  private async sendString(typ: string, str: string) {
    await this.sendLine(typ, encodeBuffer(str));
  }

  private async recvString(typ: string, mayHasJunk: boolean = false) {
    const buf = await this.recvCheck(typ, mayHasJunk);
    return uint8ToStr(decodeBuffer(buf));
  }

  private async checkString(expect: string) {
    const result = await this.recvString("SUCC");
    if (result !== expect) {
      throw new TrzszError(`[${result}] <> [${expect}]`, null, true);
    }
  }

  private async sendBinary(typ: string, buf: Uint8Array) {
    await this.sendLine(typ, encodeBuffer(buf));
  }

  private async recvBinary(typ: string, mayHasJunk: boolean = false) {
    const buf = await this.recvCheck(typ, mayHasJunk);
    return decodeBuffer(buf);
  }

  private async checkBinary(expect: Uint8Array) {
    const result = await this.recvBinary("SUCC");
    if (result.length != expect.length) {
      throw new TrzszError(`[${result.length}] <> [${expect.length}]`, null, true);
    }
    for (let i = 0; i < result.length; i++) {
      if (result[i] != expect[i]) {
        throw new TrzszError(`[${result[i]}] <> [${expect[i]}]`, null, true);
      }
    }
  }

  private async sendData(data: Uint8Array, binary: boolean, escapeCodes: Array<number[]>) {
    if (!binary) {
      await this.sendBinary("DATA", data);
      return;
    }

    const buf = escapeData(data, escapeCodes);
    this.writer(`#DATA:${buf.length}\n`);
    this.writer(buf);
  }

  private async recvData(binary: boolean, escapeCodes: Array<number[]>, timeoutInMilliseconds: number) {
    return await Promise.race<Uint8Array>([
      new Promise<Uint8Array>((resolve, reject) =>
        setTimeout(() => {
          this.cleanTimeoutInMilliseconds = 3000;
          reject(new TrzszError("Receive data timeout"));
        }, timeoutInMilliseconds)
      ),
      (async () => {
        if (!binary) {
          return await this.recvBinary("DATA");
        }
        const size = await this.recvInteger("DATA");
        const data = await this.buffer.readBinary(size);
        return unescapeData(data, escapeCodes);
      })(),
    ]);
  }

  public async sendAction(confirm: boolean) {
    const action = { lang: "js", confirm: confirm, version: trzszVersion };
    await this.sendString("ACT", JSON.stringify(action));
  }

  public async recvAction() {
    const buf = await this.recvString("ACT");
    return JSON.parse(buf);
  }

  public async sendConfig() {
    this.transferConfig = { lang: "js" };
    await this.sendString("CFG", JSON.stringify(this.transferConfig));
  }

  public async recvConfig() {
    const buf = await this.recvString("CFG", true);
    this.transferConfig = JSON.parse(buf);
    this.tmuxOutputJunk = this.transferConfig.tmux_output_junk === true;
    return this.transferConfig;
  }

  public async handleClientError(err: Error) {
    await this.cleanInput(this.cleanTimeoutInMilliseconds);

    let trace = true;
    if (err instanceof TrzszError) {
      trace = err.isTraceBack();
      if (err.isRemoteExit()) {
        return;
      }
      if (err.isRemoteFail()) {
        if (trace) {
          console.log(TrzszError.getErrorMessage(err));
        }
        return;
      }
    }

    const errMsg = TrzszError.getErrorMessage(err);
    await this.sendString(trace ? "FAIL" : "fail", errMsg);
    if (trace) {
      console.log(errMsg);
    }
  }

  public async sendExit(msg: string) {
    await this.cleanInput(200);
    await this.sendString("EXIT", msg);
  }

  public async sendFiles(files: TrzszFileReader[], progressCallback: ProgressCallback) {
    this.openedFiles.push(...files);

    const num = files.length;
    await this.sendInteger("NUM", num);
    await this.checkInteger(num);
    if (progressCallback) {
      progressCallback.onNum(num);
    }

    const remoteNames = [];
    const binary = this.transferConfig.binary === true;
    const buffer = new ArrayBuffer(this.transferConfig.bufsize ? this.transferConfig.bufsize : 10240);
    const escapeCodes = this.transferConfig.escape_chars ? escapeCharsToCodes(this.transferConfig.escape_chars) : [];

    for (const file of files) {
      const fileName = file.getName();
      await this.sendString("NAME", fileName);
      const remoteName = await this.recvString("SUCC");
      if (progressCallback) {
        progressCallback.onName(fileName);
      }

      const fileSize = file.getSize();
      await this.sendInteger("SIZE", fileSize);
      await this.checkInteger(fileSize);
      if (progressCallback) {
        progressCallback.onSize(fileSize);
      }

      let step = 0;
      const md5 = new Md5();
      while (step < fileSize) {
        const data = await file.readFile(buffer);
        await this.sendData(data, binary, escapeCodes);
        md5.appendByteArray(data);
        await this.checkInteger(data.length);
        step += data.length;
        if (progressCallback) {
          progressCallback.onStep(step);
        }
      }
      file.closeFile();

      const digest = new Uint8Array((md5.end(true) as Int32Array).buffer);
      await this.sendBinary("MD5", digest);
      await this.checkBinary(digest);
      if (progressCallback) {
        progressCallback.onDone(remoteName);
      }
      remoteNames.push(remoteName);
    }

    return remoteNames;
  }

  public async recvFiles(saveParam: any, openSaveFile: OpenSaveFile, progressCallback: ProgressCallback) {
    const num = await this.recvInteger("NUM");
    await this.sendInteger("SUCC", num);
    if (progressCallback) {
      progressCallback.onNum(num);
    }

    const localNames = [];
    const binary = this.transferConfig.binary === true;
    const overwrite = this.transferConfig.overwrite === true;
    const timeoutInMilliseconds = this.transferConfig.timeout ? this.transferConfig.timeout * 1000 : 100000;
    const escapeCodes = this.transferConfig.escape_chars ? escapeCharsToCodes(this.transferConfig.escape_chars) : [];

    for (let i = 0; i < num; i++) {
      const fileName = await this.recvString("NAME");
      const file = await openSaveFile(saveParam, fileName, overwrite);
      this.openedFiles.push(file);
      const localName = file.getName();
      await this.sendString("SUCC", localName);
      if (progressCallback) {
        progressCallback.onName(fileName);
      }

      const fileSize = await this.recvInteger("SIZE");
      await this.sendInteger("SUCC", fileSize);
      if (progressCallback) {
        progressCallback.onSize(fileSize);
      }

      let step = 0;
      const md5 = new Md5();
      while (step < fileSize) {
        const data = await this.recvData(binary, escapeCodes, timeoutInMilliseconds);
        await file.writeFile(data);
        step += data.length;
        if (progressCallback) {
          progressCallback.onStep(step);
        }
        await this.sendInteger("SUCC", data.length);
        md5.appendByteArray(data);
      }
      file.closeFile();

      const actualDigest = new Uint8Array((md5.end(true) as Int32Array).buffer);
      const expectDigest = await this.recvBinary("MD5");
      if (actualDigest.length != expectDigest.length) {
        throw new TrzszError(`Check MD5 of ${fileName} invalid`);
      }
      for (let j = 0; j < actualDigest.length; j++) {
        if (actualDigest[j] != expectDigest[j]) {
          throw new TrzszError(`Check MD5 of ${fileName} failed`);
        }
      }
      await this.sendBinary("SUCC", actualDigest);
      if (progressCallback) {
        progressCallback.onDone(localName);
      }
      localNames.push(localName);
    }

    return localNames;
  }
}
