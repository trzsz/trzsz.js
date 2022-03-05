/**
 * trzsz: https://github.com/trzsz/trzsz.js
 * Copyright(c) 2022 Lonny Wong <lonnywong@qq.com>
 * @license MIT
 */

import * as Pako from "pako";
import * as Base64 from "base64-js";
import { TrzszBuffer } from "./buffer";
import { strToUint8, uint8ToStr, TrzszError, TrzszFile, TrzszFileReader } from "./comm";

/**
 * trzsz version injected by rollup-plugin-version-injector
 */
export const trzszVersion = "[VersionInject]{version}[/VersionInject]";

/* eslint-disable require-jsdoc */

export function encodeBuffer(buf: string | Uint8Array): string {
  return Base64.fromByteArray(Pako.deflate(buf));
}

export function decodeBuffer(buf: string): Uint8Array {
  return Pako.inflate(Base64.toByteArray(buf));
}

export class TrzszTransfer {
  private buffer: TrzszBuffer = new TrzszBuffer();
  private writer: (data: string | Uint8Array) => void;
  private openedFiles: TrzszFile[] = [];

  public constructor(writer: (data: string | Uint8Array) => void) {
    this.writer = writer;
  }

  public cleanup() {
    for (const file of this.openedFiles) {
      file.closeFile();
    }
  }

  public addReceivedData(data: string | ArrayBuffer | Blob) {
    this.buffer.addBuffer(data);
  }

  public async stopTransferring() {
    // TODO safe exit
    this.buffer.stopBuffer();
  }

  private async cleanInput(timeoutMilliseconds: number) {
    // TODO wait until no server output
  }

  public async sendLine(typ: string, buf: string) {
    this.writer(`#${typ}:${buf}\n`);
  }

  public async sendString(typ: string, buf: string) {
    await this.sendLine(typ, encodeBuffer(buf));
  }

  public async sendExit(msg: string) {
    await this.cleanInput(200);
    await this.sendString("EXIT", msg);
  }

  public async sendAction(confirm: boolean) {
    const action = { lang: "js", confirm: confirm, version: trzszVersion };
    await this.sendString("ACT", JSON.stringify(action));
  }

  public async recvAction() {}

  public async sendConfig() {}

  public async recvConfig(): Promise<any> {
    return {};
  }

  public async sendFiles(files: TrzszFileReader[], config: any, progressCallback: any): Promise<string[]> {
    // TODO send files
    const buffer = new ArrayBuffer(5);
    this.openedFiles.push(...files);
    for (let i = 0; i < 3; i++) {
      const buf = await files[0].readFile(buffer);
      console.log(uint8ToStr(buf));
    }
    return [];
  }

  public async recvFiles(path: string, config: any, saveCallback: any, progressCallback: any): Promise<string[]> {
    // TODO recv files
    const file = await saveCallback(path, "test.txt", false);
    this.openedFiles.push(file);
    await file.writeFile(strToUint8("test content\n"));
    file.closeFile();
    return [file.getName()];
  }

  public async handleClientError(err: Error) {
    // TODO handle error
    if (err instanceof TrzszError && err.trace === false) {
      await this.sendExit(err.message);
      return;
    }
    await this.sendExit(err.stack);
  }
}
