/**
 * trzsz: https://github.com/trzsz/trzsz.js
 * Copyright(c) 2022 Lonny Wong <lonnywong@qq.com>
 * @license MIT
 */

import * as nodefs from "./nodefs";
import * as browser from "./browser";
import { TrzszError } from "./comm";
import { TrzszOptions } from "./options";
import { TrzszTransfer } from "./transfer";
import { TextProgressBar } from "./progress";
import { isRunningInBrowser, strToUint8, uint8ToStr } from "./comm";

/**
 * trzsz magic key
 */
const trzszMagicKeyPrefix = "::TRZSZ:TRANSFER:";
const trzszMagicKeyRegExp = new RegExp(/::TRZSZ:TRANSFER:([SRD]):(\d+\.\d+\.\d+)(:\d+)?/);
const trzszMagicArray = new Float64Array(strToUint8(trzszMagicKeyPrefix).buffer, 0, 2);

/**
 * Find the trzsz magic key from output buffer.
 * @param {string | ArrayBuffer | Uint8Array | Blob} output - The output buffer.
 */
export async function findTrzszMagicKey(output: string | ArrayBuffer | Uint8Array | Blob) {
  if (typeof output === "string") {
    const idx = output.lastIndexOf(trzszMagicKeyPrefix);
    return idx < 0 ? null : output.substring(idx);
  }
  let uint8: Uint8Array;
  if (output instanceof ArrayBuffer) {
    uint8 = new Uint8Array(output);
  } else if (output instanceof Uint8Array) {
    uint8 = output;
  } else if (output instanceof Blob) {
    uint8 = new Uint8Array(await output.arrayBuffer());
  } else {
    return null;
  }
  if (uint8.length < 26) {
    return null;
  }

  let idx = -1;
  let found = -1;
  while (true) {
    idx = uint8.indexOf(0x3a, idx + 1); // the index of next `:`
    if (idx < 0 || uint8.length - idx < 26) {
      if (found >= 0) {
        return uint8ToStr(uint8.subarray(found));
      }
      return null;
    }
    const arr = new Float64Array(uint8.buffer.slice(uint8.byteOffset + idx, uint8.byteOffset + idx + 16));
    if (arr[0] == trzszMagicArray[0] && arr[1] == trzszMagicArray[1]) {
      found = idx;
      idx += 25; // try to find next one
    }
  }
}

/**
 * Trzsz filter the input and output to upload and download files.
 */
export class TrzszFilter {
  private writeToTerminal: (output: string | ArrayBuffer | Uint8Array | Blob) => void;
  private sendToServer: (input: string | Uint8Array) => void;
  private chooseSendFiles?: (directory?: boolean) => Promise<string[] | undefined>;
  private chooseSaveDirectory?: () => Promise<string | undefined>;
  private requireUserPermission?: (fileName: string) => Promise<boolean>;
  private terminalColumns: number;
  private isWindowsShell: boolean;
  private trzszTransfer: TrzszTransfer | null = null;
  private textProgressBar: TextProgressBar | null = null;
  private uniqueIdMaps: Map<string, number> = new Map<string, number>();

  /**
   * Create a trzsz filter to upload and download files.
   * @param {TrzszOptions} options - The trzsz options.
   */
  public constructor(options: TrzszOptions) {
    if (!options) {
      throw new TrzszError("TrzszOptions is required");
    }

    if (!options.writeToTerminal) {
      throw new TrzszError("TrzszOptions.writeToTerminal is required");
    }
    this.writeToTerminal = options.writeToTerminal;

    if (!options.sendToServer) {
      throw new TrzszError("TrzszOptions.sendToServer is required");
    }
    this.sendToServer = options.sendToServer;

    this.chooseSendFiles = options.chooseSendFiles;
    this.chooseSaveDirectory = options.chooseSaveDirectory;
    this.requireUserPermission = options.requireUserPermission;
    this.terminalColumns = options.terminalColumns || 80;
    this.isWindowsShell = !!options.isWindowsShell;
  }

  /**
   * Process the server output.
   * @param {string} output - The server output.
   */
  public processServerOutput(output: string | ArrayBuffer | Uint8Array | Blob): void {
    if (this.isTransferringFiles()) {
      this.trzszTransfer.addReceivedData(output);
      return;
    }
    setTimeout(() => this.detectAndHandleTrzsz(output), 10);
    this.writeToTerminal(output);
  }

  /**
   * Process the terminal input (aka: user input).
   * @param {string} input - The terminal input (aka: user input).
   */
  public processTerminalInput(input: string): void {
    if (this.isTransferringFiles()) {
      if (input === "\x03") {
        // `ctrl + c` to stop transferring files
        this.stopTransferringFiles();
      }
      return; // ignore input while transferring files
    }
    this.sendToServer(input);
  }

  /**
   * Process the terminal binary input (aka: mouse events).
   * @param {string} input - The terminal binary input (aka: mouse events).
   */
  public processBinaryInput(input: string): void {
    if (this.isTransferringFiles()) {
      return; // ignore input while transferring files
    }
    this.sendToServer(strToUint8(input));
  }

  /**
   * Reset the terminal columns on resizing.
   * @param {number} columns - The columns of terminal.
   */
  public setTerminalColumns(columns: number): void {
    this.terminalColumns = columns;
    if (this.textProgressBar != null) {
      this.textProgressBar.setTerminalColumns(columns);
    }
  }

  /**
   * @return {boolean} Is transferring files or not.
   */
  public isTransferringFiles(): boolean {
    return this.trzszTransfer != null;
  }

  /**
   * Stop transferring files.
   */
  public stopTransferringFiles(): void {
    if (!this.isTransferringFiles()) {
      return;
    }
    void this.trzszTransfer.stopTransferring();
  }

  // disable jsdoc for private method
  /* eslint-disable require-jsdoc */

  private uniqueIdExists(uniqueId: string) {
    if (uniqueId.length < 8) {
      return false;
    }
    if (this.uniqueIdMaps.has(uniqueId)) {
      return true;
    }
    if (this.uniqueIdMaps.size >= 100) {
      const m = new Map<string, number>();
      for (const [key, value] of this.uniqueIdMaps) {
        if (value >= 50) {
          m.set(key, value - 50);
        }
      }
      this.uniqueIdMaps = m;
    }
    this.uniqueIdMaps.set(uniqueId, this.uniqueIdMaps.size);
    return false;
  }

  private async detectAndHandleTrzsz(output: string | ArrayBuffer | Uint8Array | Blob) {
    const buffer = await findTrzszMagicKey(output);
    if (!buffer) {
      return;
    }

    const found = buffer.match(trzszMagicKeyRegExp);
    if (!found) {
      return;
    }

    const uniqueId = found.length > 3 ? found[3] : "";
    if (this.uniqueIdExists(uniqueId)) {
      return;
    }

    const mode = found[1];
    const version = found[2];
    const remoteIsWindows = uniqueId == ":1";

    try {
      this.trzszTransfer = new TrzszTransfer(this.sendToServer, this.isWindowsShell);
      if (mode === "S") {
        await this.handleTrzszDownloadFiles(version, remoteIsWindows);
      } else if (mode === "R") {
        await this.handleTrzszUploadFiles(version, false, remoteIsWindows);
      } else if (mode === "D") {
        await this.handleTrzszUploadFiles(version, true, remoteIsWindows);
      }
    } catch (err) {
      await this.trzszTransfer.clientError(err);
    } finally {
      this.trzszTransfer.cleanup();
      this.textProgressBar = null;
      this.trzszTransfer = null;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async handleTrzszDownloadFiles(version: string, remoteIsWindows: boolean) {
    let savePath;
    let saveParam;
    let openSaveFile;
    if (isRunningInBrowser) {
      openSaveFile = browser.openSaveFile;
      saveParam = this.requireUserPermission ? this.requireUserPermission : browser.defaultRequireUserPermission;
    } else {
      savePath = await this.chooseSaveDirectory();
      if (!savePath) {
        await this.trzszTransfer.sendAction(false, remoteIsWindows);
        return;
      }
      nodefs.checkPathWritable(savePath);
      openSaveFile = nodefs.openSaveFile;
      saveParam = savePath;
    }

    await this.trzszTransfer.sendAction(true, remoteIsWindows);
    const config = await this.trzszTransfer.recvConfig();

    if (config.quiet !== true) {
      this.textProgressBar = new TextProgressBar(this.writeToTerminal, this.terminalColumns, config.tmux_pane_width);
    }

    const localNames = await this.trzszTransfer.recvFiles(saveParam, openSaveFile, this.textProgressBar);

    await this.trzszTransfer.clientExit(`Saved ${localNames.join(", ")}${savePath ? " to " + savePath : ""}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async handleTrzszUploadFiles(version: string, directory: boolean, remoteIsWindows: boolean) {
    let sendFiles;
    if (isRunningInBrowser) {
      if (directory) {
        // The action will send that transferring directories is not supported.
        await this.trzszTransfer.sendAction(true, remoteIsWindows);
        // The receiving configuration should fail.
        await this.trzszTransfer.recvConfig();
        return;
      }
      sendFiles = await browser.selectSendFiles();
    } else {
      const filePaths = await this.chooseSendFiles(directory);
      nodefs.checkFilesReadable(filePaths);
      sendFiles = await nodefs.openSendFiles(filePaths);
    }

    if (!sendFiles || !sendFiles.length) {
      await this.trzszTransfer.sendAction(false, remoteIsWindows);
      return;
    }

    await this.trzszTransfer.sendAction(true, remoteIsWindows);
    const config = await this.trzszTransfer.recvConfig();

    if (config.quiet !== true) {
      this.textProgressBar = new TextProgressBar(this.writeToTerminal, this.terminalColumns, config.tmux_pane_width);
    }

    const remoteNames = await this.trzszTransfer.sendFiles(sendFiles, this.textProgressBar);

    await this.trzszTransfer.clientExit(`Received ${remoteNames.join(", ")}`);
  }
}
