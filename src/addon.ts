/**
 * trzsz: https://github.com/trzsz/trzsz.js
 * Copyright(c) 2022 Lonny Wong <lonnywong@qq.com>
 * @license MIT
 */

import { TrzszFilter } from "./filter";
import { Terminal, IDisposable, ITerminalAddon } from "xterm";

/**
 * An addon for xterm.js that supports trzsz
 */
export class TrzszAddon implements ITerminalAddon {
  private socket: WebSocket;
  private disposables: IDisposable[] = [];
  private chooseSendFiles?: () => Promise<string[]>;
  private chooseSaveDirectory?: () => Promise<string>;

  /**
   * Create a TrzszAddon
   * @param {WebSocket} socket - The websocket connection.
   * @param {Promise<string[]>} chooseSendFiles - Choose some files to be sent to the server.
   *                                              No need for webshell or which running in a browser.
   * @param {Promise<string>} chooseSaveDirectory - Choose a directory to save the received files.
   *                                                No need for webshell or which running in a browser.
   */
  constructor(
    socket: WebSocket,
    chooseSendFiles?: () => Promise<string[]>,
    chooseSaveDirectory?: () => Promise<string>
  ) {
    this.socket = socket;
    this.chooseSendFiles = chooseSendFiles;
    this.chooseSaveDirectory = chooseSaveDirectory;
    // always set binary type to arraybuffer
    this.socket.binaryType = "arraybuffer";
  }

  /**
   * Activate TrzszAddon
   * @param {Terminal} terminal - The xterm.js terminal
   */
  public activate(terminal: Terminal): void {
    const writeToTerminal = (data) => {
      terminal.write(typeof data === "string" ? data : new Uint8Array(data));
    };
    const sendToServer = (data) => {
      if (this.socket.readyState !== 1) {
        return;
      }
      this.socket.send(data);
    };
    const trzsz = new TrzszFilter(
      {
        writeToTerminal: writeToTerminal,
        sendToServer: sendToServer,
        chooseSendFiles: this.chooseSendFiles,
        chooseSaveDirectory: this.chooseSaveDirectory,
      },
      terminal.cols
    );

    this.disposables.push(this.addSocketListener(this.socket, "message", (ev) => trzsz.processServerOutput(ev.data)));
    this.disposables.push(terminal.onData((data) => trzsz.processTerminalInput(data)));
    this.disposables.push(terminal.onBinary((data) => trzsz.processBinaryInput(data)));
    this.disposables.push(terminal.onResize((size) => trzsz.setTerminalColumns(size.cols)));
    this.disposables.push(this.addSocketListener(this.socket, "close", () => this.dispose()));
    this.disposables.push(this.addSocketListener(this.socket, "error", () => this.dispose()));
  }

  /**
   * Dispose TrzszAddon
   */
  public dispose(): void {
    for (const d of this.disposables) {
      d.dispose();
    }
  }

  /**
   * Add websocket event handler
   * @param {WebSocket} socket - The websocket connection.
   * @param {K} type - The websocket event type.
   * @param {Function} handler - The websocket event handler.
   * @return {IDisposable} The disposable object.
   */
  protected addSocketListener<K extends keyof WebSocketEventMap>(
    socket: WebSocket,
    type: K,
    handler: (this: WebSocket, ev: WebSocketEventMap[K]) => any
  ): IDisposable {
    socket.addEventListener(type, handler);
    return {
      dispose: () => {
        if (!handler) {
          return; // already disposed
        }
        socket.removeEventListener(type, handler);
      },
    };
  }
}
