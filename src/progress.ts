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

export function getSubstring(str: string, max: number): string {
  let len = 0;
  let sub = "";
  for (let i = 0; i < str.length; i++) {
    if (str.charCodeAt(i) >= 0x4e00 && str.charCodeAt(i) <= 0x9fa5) {
      if (len + 2 > max) {
        return sub;
      }
      len += 2;
    } else {
      if (len + 1 > max) {
        return sub;
      }
      len += 1;
    }
    sub += str[i];
  }
  return str;
}

function convertSizeToString(size: number): string {
  if (!isFinite(size)) {
    return "NaN";
  }

  let unit = "B";
  if (size > 1024) {
    size = size / 1024;
    unit = "KB";
  }
  if (size > 1024) {
    size = size / 1024;
    unit = "MB";
  }
  if (size > 1024) {
    size = size / 1024;
    unit = "GB";
  }
  if (size > 1024) {
    size = size / 1024;
    unit = "GB";
  }
  if (size > 1024) {
    size = size / 1024;
    unit = "TB";
  }

  let result;
  if (size >= 100) {
    result = size.toFixed(0);
  } else if (size >= 10) {
    result = size.toFixed(1);
  } else {
    result = size.toFixed(2);
  }

  return result + unit;
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

  public constructor(writer: (output: string) => void, columns: number) {
    this.writer = writer;
    this.columns = columns;
  }

  public setTerminalColumns(columns: number): void {
    this.columns = columns;
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
    if (now - this.lastUpdateTime < 200) {
      return;
    }
    this.lastUpdateTime = now;

    const percentage = Math.round((this.fileStep * 100) / this.fileSize).toString() + "%";
    const total = convertSizeToString(this.fileStep);
    const speed = convertSizeToString((this.fileStep * 1000) / (now - this.startTime)) + "/s";
    const leftTime = ((this.fileSize - this.fileStep) * (now - this.startTime)) / this.fileStep / 1000;
    const eta = convertTimeToString(leftTime) + " ETA";

    const progressText = this.getProgressText(percentage, total, speed, eta);
    this.writer("\r" + progressText);
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
      if (leftLength > 47) {
        left = getSubstring(left, 47) + "...";
        leftLength = getLength(left);
      }

      if (this.columns - leftLength - right.length >= barMinLength) {
        break;
      }
      if (leftLength > 37) {
        left = getSubstring(left, 37) + "...";
        leftLength = getLength(left);
      }

      if (this.columns - leftLength - right.length >= barMinLength) {
        break;
      }
      right = ` ${percentage} | ${speed} | ${eta}`;

      if (this.columns - leftLength - right.length >= barMinLength) {
        break;
      }
      if (leftLength > 27) {
        left = getSubstring(left, 27) + "...";
        leftLength = getLength(left);
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
      if (leftLength > 17) {
        left = getSubstring(left, 17) + "...";
        leftLength = getLength(left);
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public onDone(name: string) {
    this.writer("\r");
  }
}
