/**
 * trzsz: https://github.com/trzsz/trzsz.js
 * Copyright(c) 2022 Lonny Wong <lonnywong@qq.com>
 * @license MIT
 */

/* eslint-disable require-jsdoc */

import { ProgressCallback } from "./comm";

function getLength(str: string): number {
  return str.replace(/[\u4e00-\u9fa5]/g, "**").length;
}

export function getEllipsisString(str: string, max: number) {
  max -= 3;
  let len = 0;
  let sub = "";
  for (let i = 0; i < str.length; i++) {
    if (str.charCodeAt(i) >= 0x4e00 && str.charCodeAt(i) <= 0x9fa5) {
      if (len + 2 > max) {
        return { sub: sub + "...", len: len + 3 };
      }
      len += 2;
    } else {
      if (len + 1 > max) {
        return { sub: sub + "...", len: len + 3 };
      }
      len += 1;
    }
    sub += str[i];
  }
  return { sub: sub + "...", len: len + 3 };
}

function convertSizeToString(size: number): string {
  if (!isFinite(size)) {
    return "NaN";
  }

  let unit = "B";
  do {
    if (size < 1024) {
      break;
    }
    size = size / 1024;
    unit = "KB";

    if (size < 1024) {
      break;
    }
    size = size / 1024;
    unit = "MB";

    if (size < 1024) {
      break;
    }
    size = size / 1024;
    unit = "GB";

    if (size < 1024) {
      break;
    }
    size = size / 1024;
    unit = "TB";
  } while (false);

  if (size >= 100) {
    return size.toFixed(0) + unit;
  } else if (size >= 10) {
    return size.toFixed(1) + unit;
  } else {
    return size.toFixed(2) + unit;
  }
}

function convertTimeToString(seconds: number) {
  if (!isFinite(seconds)) {
    return "NaN";
  }

  let result = "";
  if (seconds >= 3600) {
    result += Math.floor(seconds / 3600).toString() + ":";
    seconds %= 3600;
  }

  const minute = Math.floor(seconds / 60);
  result += minute >= 10 ? minute.toString() : "0" + minute.toString();
  result += ":";

  const second = Math.round(seconds % 60);
  result += second >= 10 ? second.toString() : "0" + second.toString();

  return result;
}

export class TextProgressBar implements ProgressCallback {
  private writer: (output: string) => void;
  private lastUpdateTime: number = 0;
  private columns: number;
  private fileCount: number;
  private fileIdx: number;
  private fileName: string;
  private fileSize: number;
  private fileStep: number;
  private startTime: number;
  private tmuxPaneColumns: number;
  private firstWrite: boolean = true;

  public constructor(
    writer: (output: string) => void,
    columns: number,
    tmuxPaneColumns: number | undefined = undefined
  ) {
    this.writer = writer;
    this.tmuxPaneColumns = tmuxPaneColumns || -1;
    // -1 to avoid xterm.js messing up the tmux pane
    this.columns = this.tmuxPaneColumns > 1 ? this.tmuxPaneColumns - 1 : columns;
  }

  public setTerminalColumns(columns: number): void {
    this.columns = columns;
    // resizing tmux panes is not supported
    if (this.tmuxPaneColumns > 0) {
      this.tmuxPaneColumns = -1;
    }
  }

  public onNum(num: number) {
    this.fileCount = num;
    this.fileIdx = 0;
  }

  public onName(name: string) {
    this.fileName = name;
    this.fileIdx += 1;
    this.startTime = Date.now();
  }

  public onSize(size: number) {
    this.fileSize = size;
  }

  public onStep(step: number) {
    this.fileStep = step;
    this.showProgress();
  }

  private showProgress() {
    const now = Date.now();
    if (now - this.lastUpdateTime < 500) {
      return;
    }
    this.lastUpdateTime = now;

    if (this.fileSize == 0) {
      return;
    }
    const percentage = Math.round((this.fileStep * 100) / this.fileSize).toString() + "%";
    const total = convertSizeToString(this.fileStep);
    const speed = convertSizeToString((this.fileStep * 1000) / (now - this.startTime)) + "/s";
    const leftTime = ((this.fileSize - this.fileStep) * (now - this.startTime)) / this.fileStep / 1000;
    const eta = convertTimeToString(leftTime) + " ETA";

    const progressText = this.getProgressText(percentage, total, speed, eta);

    if (this.firstWrite) {
      this.firstWrite = false;
      this.writer(progressText);
      return;
    }

    if (this.tmuxPaneColumns > 0) {
      this.writer(`\x1b[${this.columns}D${progressText}`);
    } else {
      this.writer(`\r${progressText}`);
    }
  }

  private getProgressText(percentage: string, total: string, speed: string, eta: string) {
    const barMinLength = 24;
    let left = this.fileCount > 1 ? `(${this.fileIdx}/${this.fileCount}) ${this.fileName}` : this.fileName;
    let leftLength = getLength(left);
    let right = ` ${percentage} | ${total} | ${speed} | ${eta}`;

    do {
      if (this.columns - leftLength - right.length >= barMinLength) {
        break;
      }
      if (leftLength > 50) {
        ({ sub: left, len: leftLength } = getEllipsisString(left, 50));
      }

      if (this.columns - leftLength - right.length >= barMinLength) {
        break;
      }
      if (leftLength > 40) {
        ({ sub: left, len: leftLength } = getEllipsisString(left, 40));
      }

      if (this.columns - leftLength - right.length >= barMinLength) {
        break;
      }
      right = ` ${percentage} | ${speed} | ${eta}`;

      if (this.columns - leftLength - right.length >= barMinLength) {
        break;
      }
      if (leftLength > 30) {
        ({ sub: left, len: leftLength } = getEllipsisString(left, 30));
      }

      if (this.columns - leftLength - right.length >= barMinLength) {
        break;
      }
      right = ` ${percentage} | ${eta}`;

      if (this.columns - leftLength - right.length >= barMinLength) {
        break;
      }
      right = ` ${percentage}`;

      if (this.columns - leftLength - right.length >= barMinLength) {
        break;
      }
      if (leftLength > 20) {
        ({ sub: left, len: leftLength } = getEllipsisString(left, 20));
      }

      if (this.columns - leftLength - right.length >= barMinLength) {
        break;
      }
      left = "";
      leftLength = 0;
    } while (false);

    let barLength = this.columns - right.length;
    if (leftLength > 0) {
      barLength -= leftLength + 1;
      left += " ";
    }

    const bar = this.getProgressBar(barLength);
    return (left + bar + right).trim();
  }

  private getProgressBar(len: number) {
    if (len < 12) {
      return "";
    }
    const total = len - 2;
    const complete = Math.round((total * this.fileStep) / this.fileSize);
    return "[\u001b[36m" + "\u2588".repeat(complete) + "\u2591".repeat(total - complete) + "\u001b[0m]";
  }

  public onDone() {
    if (!this.firstWrite) {
      if (this.tmuxPaneColumns > 0) {
        this.writer(`\x1b[${this.columns}D`);
      } else {
        this.writer("\r");
      }
      this.firstWrite = true;
    }
  }
}
