/**
 * trzsz: https://github.com/trzsz/trzsz.js
 * Copyright(c) 2022 Lonny Wong <lonnywong@qq.com>
 * @license MIT
 */

import { Md5 } from "ts-md5";
import { TrzszBuffer } from "./buffer";
import { escapeCharsToCodes, escapeData, unescapeData } from "./escape";
import {
  trzszVersion,
  isRunningInBrowser,
  uint8ToStr,
  encodeBuffer,
  decodeBuffer,
  TrzszError,
  TrzszFile,
  OpenSaveFile,
  TrzszFileReader,
  ProgressCallback,
} from "./comm";

/* eslint-disable require-jsdoc */

export class TrzszTransfer {
  private buffer: TrzszBuffer = new TrzszBuffer();
  private writer: (data: string | Uint8Array) => void;
  private isWindowsShell: boolean;
  private lastInputTime: number = 0;
  private openedFiles: TrzszFile[] = [];
  private tmuxOutputJunk: boolean = false;
  private cleanTimeoutInMilliseconds: number = 100;
  private transferConfig: any = {};
  private stopped: boolean = false;
  private maxChunkTimeInMilliseconds: number = 0;
  private protocolNewline: string = "\n";

  public constructor(writer: (data: string | Uint8Array) => void, isWindowsShell: boolean = false) {
    this.writer = writer;
    this.isWindowsShell = isWindowsShell;
  }

  public cleanup() {
    for (const file of this.openedFiles) {
      file.closeFile();
    }
  }

  public addReceivedData(data: string | ArrayBuffer | Uint8Array | Blob) {
    if (!this.stopped) {
      this.buffer.addBuffer(data);
    }
    this.lastInputTime = Date.now();
  }

  public async stopTransferring() {
    this.cleanTimeoutInMilliseconds = Math.max(this.maxChunkTimeInMilliseconds * 2, 500);
    this.stopped = true;
    this.buffer.stopBuffer();
  }

  private async cleanInput(timeoutInMilliseconds: number) {
    this.stopped = true;
    this.buffer.drainBuffer();
    if (this.lastInputTime == 0) {
      return;
    }
    while (true) {
      const sleepTime = timeoutInMilliseconds - (Date.now() - this.lastInputTime);
      if (sleepTime <= 0) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, sleepTime));
    }
  }

  private async sendLine(typ: string, buf: string) {
    this.writer(`#${typ}:${buf}${this.protocolNewline}`);
  }

  private async recvLine(expectType: string, mayHasJunk: boolean = false) {
    if (this.stopped) {
      throw new TrzszError("Stopped");
    }

    if (this.isWindowsShell) {
      let line = await this.buffer.readLineOnWindows();
      if (this.tmuxOutputJunk || mayHasJunk) {
        const idx = line.lastIndexOf("#" + expectType + ":");
        if (idx >= 0) {
          line = line.substring(idx);
        }
      }
      return line;
    }

    let line = await this.buffer.readLine();

    if (this.tmuxOutputJunk || mayHasJunk) {
      if (line.length > 0) {
        while (line[line.length - 1] === "\r") {
          line = line.substring(0, line.length - 1) + (await this.buffer.readLine());
        }
      }
      const idx = line.lastIndexOf("#" + expectType + ":");
      if (idx >= 0) {
        line = line.substring(idx);
      }
    }

    return line;
  }

  private async recvCheck(expectType: string, mayHasJunk: boolean = false) {
    const line = await this.recvLine(expectType, mayHasJunk);
    const idx = line.indexOf(":");
    if (idx < 1) {
      throw new TrzszError(encodeBuffer(line), "colon", true);
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

  public async sendAction(confirm: boolean, remoteIsWindows: boolean, supportDir: boolean) {
    const action: any = {
      lang: "js",
      confirm: confirm,
      version: trzszVersion,
      support_dir: supportDir,
    };
    if (this.isWindowsShell) {
      action.binary = false;
      action.newline = "!\n";
    }
    if (remoteIsWindows) {
      this.protocolNewline = "!\n";
    }
    await this.sendString("ACT", JSON.stringify(action));
  }

  public async recvAction() {
    const buf = await this.recvString("ACT");
    const action = JSON.parse(buf);
    if (action.newline) {
      this.protocolNewline = action.newline;
    }
    return action;
  }

  public async sendConfig() {
    this.transferConfig = { lang: "js" };
    let jsonStr = JSON.stringify(this.transferConfig);
    jsonStr = jsonStr.replace(/[\u007F-\uFFFF]/g, function (chr) {
      return "\\u" + ("0000" + chr.charCodeAt(0).toString(16)).substr(-4);
    });
    await this.sendString("CFG", jsonStr);
  }

  public async recvConfig() {
    const buf = await this.recvString("CFG", true);
    this.transferConfig = JSON.parse(buf);
    this.tmuxOutputJunk = this.transferConfig.tmux_output_junk === true;
    return this.transferConfig;
  }

  public async clientExit(msg: string) {
    await this.sendString("EXIT", msg);
  }

  public async clientError(err: Error) {
    await this.cleanInput(this.cleanTimeoutInMilliseconds);

    const errMsg = TrzszError.getErrorMessage(err);
    let trace = true;
    if (err instanceof TrzszError) {
      trace = err.isTraceBack();
      if (err.isRemoteExit()) {
        return;
      }
      if (err.isRemoteFail()) {
        if (trace) {
          console.log(errMsg);
        }
        return;
      }
    }

    await this.sendString(trace ? "FAIL" : "fail", errMsg);
    if (trace) {
      console.log(errMsg);
    }
  }

  private async sendFileNum(num: number, progressCallback: ProgressCallback) {
    await this.sendInteger("NUM", num);
    await this.checkInteger(num);
    if (progressCallback) {
      progressCallback.onNum(num);
    }
  }

  private async sendFileName(file: TrzszFileReader, directory: boolean, progressCallback: ProgressCallback) {
    const relPath = file.getRelPath();
    const fileName = relPath[relPath.length - 1];
    if (directory) {
      const jsonName = {
        path_id: file.getPathId(),
        path_name: relPath,
        is_dir: file.isDir(),
      };
      await this.sendString("NAME", JSON.stringify(jsonName));
    } else {
      await this.sendString("NAME", fileName);
    }
    const remoteName = await this.recvString("SUCC");
    if (progressCallback) {
      progressCallback.onName(fileName);
    }
    return remoteName;
  }

  private async sendFileSize(size: number, progressCallback: ProgressCallback) {
    await this.sendInteger("SIZE", size);
    await this.checkInteger(size);
    if (progressCallback) {
      progressCallback.onSize(size);
    }
  }

  private async sendFileMD5(digest: Uint8Array, progressCallback: ProgressCallback) {
    await this.sendBinary("MD5", digest);
    await this.checkBinary(digest);
    if (progressCallback) {
      progressCallback.onDone();
    }
  }

  public async sendFiles(files: TrzszFileReader[], progressCallback: ProgressCallback) {
    this.openedFiles.push(...files);

    const binary = this.transferConfig.binary === true;
    const directory = this.transferConfig.directory === true;
    const maxBufSize = this.transferConfig.bufsize || 10 * 1024 * 1024;
    const escapeCodes = this.transferConfig.escape_chars ? escapeCharsToCodes(this.transferConfig.escape_chars) : [];

    await this.sendFileNum(files.length, progressCallback);

    let bufSize = 1024;
    let buffer = new ArrayBuffer(bufSize);
    const remoteNames = [];
    for (const file of files) {
      const remoteName = await this.sendFileName(file, directory, progressCallback);

      if (!remoteNames.includes(remoteName)) {
        remoteNames.push(remoteName);
      }

      if (file.isDir()) {
        continue;
      }

      const fileSize = file.getSize();
      await this.sendFileSize(fileSize, progressCallback);

      let step = 0;
      const md5 = new Md5();
      while (step < fileSize) {
        const beginTime = Date.now();
        const data = await file.readFile(buffer);
        await this.sendData(data, binary, escapeCodes);
        md5.appendByteArray(data);
        await this.checkInteger(data.length);
        step += data.length;
        if (progressCallback) {
          progressCallback.onStep(step);
        }
        const chunkTime = Date.now() - beginTime;
        if (data.length == bufSize && chunkTime < 500 && bufSize < maxBufSize) {
          bufSize = Math.min(bufSize * 2, maxBufSize);
          buffer = new ArrayBuffer(bufSize);
        }
        if (chunkTime > this.maxChunkTimeInMilliseconds) {
          this.maxChunkTimeInMilliseconds = chunkTime;
        }
      }
      file.closeFile();

      const digest = new Uint8Array((md5.end(true) as Int32Array).buffer);
      await this.sendFileMD5(digest, progressCallback);
    }

    return remoteNames;
  }

  private async recvFileNum(progressCallback: ProgressCallback) {
    const num = await this.recvInteger("NUM");
    await this.sendInteger("SUCC", num);
    if (progressCallback) {
      progressCallback.onNum(num);
    }
    return num;
  }

  private async recvFileName(
    saveParam: any,
    openSaveFile: OpenSaveFile,
    directory: boolean,
    overwrite: boolean,
    progressCallback: ProgressCallback
  ) {
    const fileName = await this.recvString("NAME");
    const file = await openSaveFile(saveParam, fileName, directory, overwrite);
    await this.sendString("SUCC", file.getLocalName());
    if (progressCallback) {
      progressCallback.onName(file.getFileName());
    }
    return file;
  }

  private async recvFileSize(progressCallback: ProgressCallback) {
    const fileSize = await this.recvInteger("SIZE");
    await this.sendInteger("SUCC", fileSize);
    if (progressCallback) {
      progressCallback.onSize(fileSize);
    }
    return fileSize;
  }

  private async recvFileMD5(digest: Uint8Array, progressCallback: ProgressCallback) {
    const expectDigest = await this.recvBinary("MD5");
    if (digest.length != expectDigest.length) {
      throw new TrzszError("Check MD5 failed");
    }
    for (let j = 0; j < digest.length; j++) {
      if (digest[j] != expectDigest[j]) {
        throw new TrzszError("Check MD5 failed");
      }
    }
    await this.sendBinary("SUCC", digest);
    if (progressCallback) {
      progressCallback.onDone();
    }
  }

  public async recvFiles(saveParam: any, openSaveFile: OpenSaveFile, progressCallback: ProgressCallback) {
    const binary = this.transferConfig.binary === true;
    const directory = this.transferConfig.directory === true;
    const overwrite = this.transferConfig.overwrite === true;
    const timeoutInMilliseconds = this.transferConfig.timeout ? this.transferConfig.timeout * 1000 : 100000;
    const escapeCodes = this.transferConfig.escape_chars ? escapeCharsToCodes(this.transferConfig.escape_chars) : [];

    const num = await this.recvFileNum(progressCallback);

    const localNames = [];
    for (let i = 0; i < num; i++) {
      const file = await this.recvFileName(saveParam, openSaveFile, directory, overwrite, progressCallback);

      if (!localNames.includes(file.getLocalName())) {
        localNames.push(file.getLocalName());
      }

      if (file.isDir()) {
        continue;
      }

      this.openedFiles.push(file);

      const fileSize = await this.recvFileSize(progressCallback);

      let step = 0;
      const md5 = new Md5();
      while (step < fileSize) {
        const beginTime = Date.now();
        const data = await this.recvData(binary, escapeCodes, timeoutInMilliseconds);
        await file.writeFile(data);
        step += data.length;
        if (progressCallback) {
          progressCallback.onStep(step);
        }
        await this.sendInteger("SUCC", data.length);
        md5.appendByteArray(data);
        const chunkTime = Date.now() - beginTime;
        if (chunkTime > this.maxChunkTimeInMilliseconds) {
          this.maxChunkTimeInMilliseconds = chunkTime;
        }
      }
      file.closeFile();

      const digest = new Uint8Array((md5.end(true) as Int32Array).buffer);
      await this.recvFileMD5(digest, progressCallback);
    }

    return localNames;
  }
}
