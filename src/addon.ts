/**
 * trzsz: https://github.com/trzsz/trzsz.js
 * Copyright(c) 2022 Lonny Wong <lonnywong@qq.com>
 * @license MIT
 */

import { TrzszOptions } from "./options";
import { TrzszFilter } from "./filter";
import { Terminal, IDisposable, ITerminalAddon } from "xterm";

/**
 * An addon for xterm.js that supports trzsz
 */
export class TrzszAddon implements ITerminalAddon {
  private socket: WebSocket;
  private disposables: IDisposable[] = [];
  private options: TrzszOptions;
  private trzsz: TrzszFilter | null = null;

  /**
   * Create a TrzszAddon
   * @param {WebSocket} socket - The websocket connection.
   * @param {TrzszOptions} options - The trzsz options.
   */
  constructor(socket: WebSocket, options?: TrzszOptions) {
    this.socket = socket;
    this.options = options || {};
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
    this.trzsz = new TrzszFilter({
      writeToTerminal: writeToTerminal,
      sendToServer: sendToServer,
      chooseSendFiles: this.options.chooseSendFiles,
      chooseSaveDirectory: this.options.chooseSaveDirectory,
      requireUserPermission: this.options.requireUserPermission,
      terminalColumns: terminal.cols,
      isWindowsShell: this.options.isWindowsShell,
    });

    this.disposables.push(
      this.addSocketListener(this.socket, "message", (ev) => this.trzsz.processServerOutput(ev.data))
    );
    this.disposables.push(terminal.onData((data) => this.trzsz.processTerminalInput(data)));
    this.disposables.push(terminal.onBinary((data) => this.trzsz.processBinaryInput(data)));
    this.disposables.push(terminal.onResize((size) => this.trzsz.setTerminalColumns(size.cols)));
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
    this.trzsz = null;
  }

  /**
   * Upload files or directories to the server.
   * @param {string[] | DataTransferItemList} items - The files or directories to upload.
   */
  public async uploadFiles(items: string[] | DataTransferItemList) {
    if (this.trzsz) {
      return this.trzsz.uploadFiles(items);
    } else {
      throw new Error("Addon has not been activated");
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
