/**
 * trzsz: https://github.com/trzsz/trzsz.js
 * Copyright(c) 2022 Lonny Wong <lonnywong@qq.com>
 * @license MIT
 */

/* eslint-disable require-jsdoc */

import { ProgressCallback } from "./comm";

export class TextProgressBar implements ProgressCallback {
  private writer: (output: string) => void;
  private columns: number;

  public constructor(writer: (output: string) => void, columns: number) {
    this.writer = writer;
    this.columns = columns;
  }

  public setTerminalColumns(columns: number): void {
    this.columns = columns;
  }

  // TODO
}
