/**
 * trzsz: https://github.com/trzsz/trzsz.js
 * Copyright(c) 2023 Lonny Wong <lonnywong@qq.com>
 * @license MIT
 */

/**
 * The trzsz options
 */
export interface TrzszOptions {
  /**
   * Write the server output to the terminal.
   * @param {string | ArrayBuffer | Uint8Array | Blob} output - The server output.
   */
  writeToTerminal?: (output: string | ArrayBuffer | Uint8Array | Blob) => void;

  /**
   * Send the terminal input (aka: user input) to the server.
   * @param {string | Uint8Array} input - The terminal input (aka: user input).
   */
  sendToServer?: (input: string | Uint8Array) => void;

  /**
   * Choose some files to be sent to the server.
   * No need for webshell or which running in a browser.
   * @param {boolean} directory - choose directories and files, or just files.
   * @return {Promise<string[] | undefined>} The file paths array to be sent.
   *                                         undefined means the user has cancelled.
   */
  chooseSendFiles?: (directory?: boolean) => Promise<string[] | undefined>;

  /**
   * Choose a directory to save the received files.
   * No need for webshell or which running in a browser.
   * @return {Promise<string | undefined>} The directory to save the received files.
   *                                       undefined means the user has cancelled.
   */
  chooseSaveDirectory?: () => Promise<string | undefined>;

  /**
   * @deprecated A user event may be required to open the save dialog in browsers.
   * No need for nodejs environment ( e.g.: electron preload.js )
   * @param {string} fileName - The file name going to download.
   * @return {Promise<boolean>} open the save dialog or cancel the download.
   */
  requireUserPermission?: (fileName: string) => Promise<boolean>;

  /**
   * The columns of terminal.
   */
  terminalColumns?: number;

  /**
   * Is there a windows shell? Such as `cmd` and `PowerShell`.
   */
  isWindowsShell?: boolean;

  /**
   * The timeout in milliseconds for initializing drag and drop files to upload.
   * Default is 3000.
   */
  dragInitTimeout?: number | undefined | null;
}
