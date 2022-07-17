/**
 * trzsz: https://github.com/trzsz/trzsz.js
 * Copyright(c) 2022 Lonny Wong <lonnywong@qq.com>
 * @license MIT
 */

import * as argparse from "argparse";

/* eslint-disable require-jsdoc */

export class BufferSizeParser extends argparse.Action {
  constructor(options) {
    const minSize = options.min_size;
    const maxSize = options.max_size;
    delete options.min_size;
    delete options.max_size;
    if (typeof options.default === "string") {
      options.default = BufferSizeParser.parseSize(options.default);
    }
    super(options);
    this.minSize = minSize;
    this.maxSize = maxSize;
  }

  static parseSize(value) {
    const match = /^(\d+)(b|k|m|g|kb|mb|gb)?$/i.exec(value);
    if (!match) {
      throw new TypeError(`invalid size ${value}`);
    }
    const sizeValue = parseInt(match[1]);
    const unitSuffix = match.length > 2 && match[2] ? match[2].toLowerCase() : "";
    if (!unitSuffix || !unitSuffix.length || unitSuffix == "b") {
      return sizeValue;
    }
    if (unitSuffix == "k" || unitSuffix == "kb") {
      return sizeValue * 1024;
    }
    if (unitSuffix == "m" || unitSuffix == "mb") {
      return sizeValue * 1024 * 1024;
    }
    if (unitSuffix == "g" || unitSuffix == "gb") {
      return sizeValue * 1024 * 1024 * 1024;
    }
    throw new TypeError(`invalid size ${value}`);
  }

  call(parser, namespace, values /* , option_string = undefined */) {
    try {
      const bufSize = BufferSizeParser.parseSize(values);
      if (this.minSize && bufSize < BufferSizeParser.parseSize(this.minSize)) {
        throw new TypeError(`less than ${this.minSize}`);
      }
      if (this.maxSize && bufSize > BufferSizeParser.parseSize(this.maxSize)) {
        throw new TypeError(`greater than ${this.maxSize}`);
      }
      namespace[this.dest] = bufSize;
    } catch (err) {
      if (err instanceof TypeError) {
        throw new argparse.ArgumentError(this, err.message);
      }
      throw err;
    }
  }
}
