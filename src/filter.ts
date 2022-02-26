/**
 * trzsz: https://github.com/trzsz/trzsz.js
 * Copyright(c) 2022 Lonny Wong <lonnywong@qq.com>
 * @license MIT
 */

/**
 * Trzsz callback functions
 */
export interface TrzszCallback {
  /**
   * Write the server output to the terminal.
   * @param {string} output - The server output.
   */
  writeToTerminal: (output: string | ArrayBuffer | Blob) => void;

  /**
   * Send the terminal input (aka: user input) to the server.
   * @param {string} input - The terminal input (aka: user input).
   */
  sendToServer: (input: string | Uint8Array) => void;

  /**
   * Choose some files to be sent to the server.
   * No need for webshell or which running in a browser.
   * @return {string[]} The file paths array to be sent.
   *                    Empty array or undefined means the user has canceled.
   */
  chooseSendFiles?: () => Promise<string[]>;

  /**
   * Choose a directory to save the received files.
   * No need for webshell or which running in a browser.
   * @return {string} The directory to save the received files.
   *                  Empty string or undefined means the user has canceled.
   */
  chooseSaveDirectory?: () => Promise<string>;
}

/**
 * Trzsz magic key regular expression
 */
const trzszMagicKeyRegExp = new RegExp(/::TRZSZ:TRANSFER:([SR]):(\d+\.\d+\.\d+)(:\d+)?/);

/**
 * Trzsz current status
 */
enum TrzszStatus {
  /** no files transferring */
  STANDBY = 0,
  /** sending files */
  SENDING = 1,
  /** receiving files */
  RECVING = 2,
}

/**
 * Trzsz filter the input and output to upload and download files.
 */
export class TrzszFilter {
  private writeToTerminal: (output: string | ArrayBuffer | Blob) => void;
  private sendToServer: (input: string | Uint8Array) => void;
  private chooseSendFiles?: () => Promise<string[]>;
  private chooseSaveDirectory?: () => Promise<string>;
  private terminalColumns: number = 80;
  private currentStatus: TrzszStatus = TrzszStatus.STANDBY;

  /**
   * Create a trzsz filter to upload and download files.
   * @param {TrzszCallback} trzszCallback - Trzsz callback functions.
   * @param {number} terminalColumns - The columns of terminal.
   */
  public constructor(trzszCallback: TrzszCallback, terminalColumns: number) {
    this.writeToTerminal = trzszCallback.writeToTerminal;
    this.sendToServer = trzszCallback.sendToServer;
    this.chooseSendFiles = trzszCallback.chooseSendFiles;
    this.chooseSaveDirectory = trzszCallback.chooseSaveDirectory;
    this.terminalColumns = terminalColumns;
  }

  /**
   * Process the server output.
   * @param {string} output - The server output.
   */
  public processServerOutput(output: string | ArrayBuffer | Blob): void {
    if (this.isTransferringFiles()) {
      // TODO do transferring files
      return;
    }
    this.detectTrzszMagicKey(output);
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
    const buffer = new Uint8Array(input.length);
    for (let i = 0; i < input.length; ++i) {
      buffer[i] = input.charCodeAt(i) & 255;
    }
    this.sendToServer(buffer);
  }

  /**
   * Reset the terminal columns on resizing.
   * @param {number} columns - The columns of terminal.
   */
  public setTerminalColumns(columns: number): void {
    this.terminalColumns = columns;
  }

  /**
   * @return {boolean} Is transferring files or not.
   */
  public isTransferringFiles(): boolean {
    return this.currentStatus === TrzszStatus.SENDING || this.currentStatus === TrzszStatus.RECVING;
  }

  /**
   * Stop transferring files.
   */
  public stopTransferringFiles(): void {
    if (!this.isTransferringFiles()) {
      return;
    }
    // TODO stop transferring files
  }

  // disable jsdoc for private method
  /* eslint-disable require-jsdoc */

  private isRunningInBrowser(): boolean {
    return typeof require === "undefined";
  }

  private async detectTrzszMagicKey(output: string | ArrayBuffer | Blob) {
    let buffer;
    if (typeof output === "string") {
      buffer = output;
    } else if (output instanceof ArrayBuffer) {
      buffer = String.fromCharCode.apply(null, new Uint8Array(output));
    } else if (output instanceof Blob) {
      buffer = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsText(output, "ISO-8859-1");
      });
    }

    const found = buffer.match(trzszMagicKeyRegExp);
    if (found) {
      if (found[1] === "S") {
        this.handleTrzszDownloadFiles(found[2]);
      } else if (found[1] === "R") {
        this.handleTrzszUploadFiles(found[2]);
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async handleTrzszDownloadFiles(version: string) {
    if (this.isRunningInBrowser()) {
      // TODO save files to memory
    } else {
      const savePath = await this.chooseSaveDirectory();
      if (!savePath) {
        this.cancelTransferringFiles();
        return;
      }
      console.log(`save to: ${savePath}`);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async handleTrzszUploadFiles(version: string) {
    if (this.isRunningInBrowser()) {
      // TODO open dialog in browser
    } else {
      const filePaths = await this.chooseSendFiles();
      if (!filePaths || !filePaths.length) {
        this.cancelTransferringFiles();
        return;
      }
      console.log(`save to: ${filePaths}`);
    }
  }

  private async cancelTransferringFiles() {
    // TODO cancel transferring files
    console.log("Cancelled.");
  }
}
