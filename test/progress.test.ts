/**
 * trzsz: https://github.com/trzsz/trzsz.js
 * Copyright(c) 2023 Lonny Wong <lonnywong@qq.com>
 * @license MIT
 */

import { TextProgressBar, getEllipsisString } from "../src/progress";

/* eslint-disable require-jsdoc */

function outputLength(str: string): number {
  return str
    .replace("\r", "")
    .replace(/\u001b\[\d+[mD]/g, "")
    .replace(/[\u4e00-\u9fa5]/g, "**").length;
}

let dateNowSpy;

beforeEach(() => {
  dateNowSpy = jest.spyOn(Date, "now");
});

afterEach(() => {
  dateNowSpy.mockRestore();
});

test("progress bar empty file", () => {
  dateNowSpy.mockReturnValueOnce(1646564135000).mockReturnValueOnce(1646564135000);
  const writer = jest.fn();
  const tgb = new TextProgressBar(writer, 100);
  tgb.onNum(1);
  tgb.onName("中文😀test.txt");
  tgb.onSize(0);
  tgb.onStep(0);
  expect(dateNowSpy.mock.calls.length).toBe(2);
  expect(writer.mock.calls.length).toBe(1);
  expect(writer.mock.calls[0][0]).toContain("中文😀test.txt [");
  expect(writer.mock.calls[0][0]).toContain("] 100% | 0.00 B | --- B/s | --- ETA");
  expect(outputLength(writer.mock.calls[0][0])).toBe(100);
});

test("progress bar zero step", () => {
  dateNowSpy.mockReturnValueOnce(1646564135000).mockReturnValueOnce(1646564135100);
  const writer = jest.fn();
  const tgb = new TextProgressBar(writer, 100);
  tgb.onNum(1);
  tgb.onName("中文😀test.txt");
  tgb.onSize(100);
  tgb.onStep(0);
  expect(writer.mock.calls.length).toBe(1);
  expect(dateNowSpy.mock.calls.length).toBe(2);
  expect(writer.mock.calls[0][0]).toContain("中文😀test.txt [");
  expect(writer.mock.calls[0][0]).toContain("] 0% | 0.00 B | --- B/s | --- ETA");
  expect(outputLength(writer.mock.calls[0][0])).toBe(100);
});

test("progress bar last step", () => {
  dateNowSpy.mockReturnValueOnce(1646564135000).mockReturnValueOnce(1646564135200);
  const writer = jest.fn();
  const tgb = new TextProgressBar(writer, 100);
  tgb.onNum(1);
  tgb.onName("中文😀test.txt");
  tgb.onSize(100);
  tgb.onStep(100);
  expect(writer.mock.calls.length).toBe(1);
  expect(dateNowSpy.mock.calls.length).toBe(2);
  expect(writer.mock.calls[0][0]).toContain("中文😀test.txt [");
  expect(writer.mock.calls[0][0]).toContain("] 100% | 100 B | 500 B/s | 00:00 ETA");
  expect(outputLength(writer.mock.calls[0][0])).toBe(100);
});

test("progress bar having speed and eta", () => {
  dateNowSpy.mockReturnValueOnce(1646564135000).mockReturnValueOnce(1646564135100);
  const writer = jest.fn();
  const tgb = new TextProgressBar(writer, 100);
  tgb.onNum(1);
  tgb.onName("中文😀test.txt");
  tgb.onSize(100);
  tgb.onStep(1);
  expect(writer.mock.calls.length).toBe(1);
  expect(dateNowSpy.mock.calls.length).toBe(2);
  expect(writer.mock.calls[0][0]).toContain("中文😀test.txt [");
  expect(writer.mock.calls[0][0]).toContain("] 1% | 1.00 B | 10.0 B/s | 00:10 ETA");
  expect(outputLength(writer.mock.calls[0][0])).toBe(100);
});

test("progress bar newest speed", () => {
  let now = 1646564135000;
  for (let i = 0; i < 101; i++) {
    dateNowSpy.mockReturnValueOnce(now + i * 1000);
  }
  const writer = jest.fn();
  const tgb = new TextProgressBar(writer, 100);
  tgb.onNum(1);
  tgb.onName("中文😀test.txt");
  tgb.onSize(100000);
  let step = 100;
  for (let i = 0; i < 100; i++) {
    step += i * 10;
    tgb.onStep(step);
  }
  expect(writer.mock.calls.length).toBe(100);
  expect(dateNowSpy.mock.calls.length).toBe(101);
  let total = 100;
  for (let i = 0; i < 100; i++) {
    total += i * 10;
    const percentage = Math.round((total * 100) / 100000);
    let speed;
    if (i < 30) {
      speed = total / (i + 1);
    } else {
      let t = 0;
      for (let j = i - 30 + 1; j <= i; j++) {
        t += j * 10;
      }
      speed = t / 30;
    }
    let totalStr = total.toFixed(0) + " B";
    if (total >= 10240) {
      totalStr = (total / 1024).toFixed(1) + " KB";
    } else if (total >= 1024) {
      totalStr = (total / 1024).toFixed(2) + " KB";
    }
    const speedStr = speed >= 100 ? speed.toFixed(0) : speed.toFixed(1);
    const eta = Math.round((100000 - total) / speed);
    const minute = Math.floor(eta / 60).toString();
    const second = Math.round(eta % 60).toString();
    expect(writer.mock.calls[i][0]).toContain("中文😀test.txt [");
    expect(writer.mock.calls[i][0]).toContain(
      `] ${percentage}% | ${totalStr} | ${speedStr} B/s | ${minute.padStart(2, "0")}:${second.padStart(2, "0")} ETA`
    );
    expect(outputLength(writer.mock.calls[i][0])).toBe(100);
  }
});

test("progress bar ouput once only", () => {
  dateNowSpy.mockReturnValueOnce(1646564135000).mockReturnValueOnce(1646564135001).mockReturnValueOnce(1646564135099);
  const writer = jest.fn();
  const tgb = new TextProgressBar(writer, 100);
  tgb.onNum(1);
  tgb.onName("中文😀test.txt");
  tgb.onSize(100);
  tgb.onStep(1);
  tgb.onStep(2);
  expect(writer.mock.calls.length).toBe(1);
  expect(dateNowSpy.mock.calls.length).toBe(3);
  expect(writer.mock.calls[0][0]).toContain("中文😀test.txt [");
  expect(writer.mock.calls[0][0]).toContain("] 1% | 1.00 B | 1000 B/s | 00:00 ETA");
  expect(outputLength(writer.mock.calls[0][0])).toBe(100);
});

test("progress bar super fast speed", () => {
  dateNowSpy.mockReturnValueOnce(1646564135000).mockReturnValueOnce(1646564136000);
  const writer = jest.fn();
  const tgb = new TextProgressBar(writer, 100);
  tgb.onNum(1);
  tgb.onName("中文😀test.txt");
  tgb.onSize(1024 * 1024 * 1024 * 1024 * 1024);
  tgb.onStep(10.1 * 1024 * 1024 * 1024 * 1024);
  expect(writer.mock.calls.length).toBe(1);
  expect(dateNowSpy.mock.calls.length).toBe(2);
  expect(writer.mock.calls[0][0]).toContain("中文😀test.txt [");
  expect(writer.mock.calls[0][0]).toContain("] 1% | 10.1 TB | 10.1 TB/s | 01:40 ETA");
  expect(outputLength(writer.mock.calls[0][0])).toBe(100);
});

test("progress bar very slow speed", () => {
  dateNowSpy.mockReturnValueOnce(1646564135000).mockReturnValueOnce(1646564136000);
  const writer = jest.fn();
  const tgb = new TextProgressBar(writer, 100);
  tgb.onNum(1);
  tgb.onName("中文😀test.txt");
  tgb.onSize(1024 * 1024);
  tgb.onStep(1);
  expect(writer.mock.calls.length).toBe(1);
  expect(dateNowSpy.mock.calls.length).toBe(2);
  expect(writer.mock.calls[0][0]).toContain("中文😀test.txt [");
  expect(writer.mock.calls[0][0]).toContain("] 0% | 1.00 B | 1.00 B/s | 291:16:15 ETA");
  expect(outputLength(writer.mock.calls[0][0])).toBe(100);
});

test("progress bar long file name", () => {
  dateNowSpy.mockReturnValueOnce(1646564135000).mockReturnValueOnce(1646564136000).mockReturnValueOnce(1646564138000);
  const writer = jest.fn();
  const tgb = new TextProgressBar(writer, 110);
  tgb.onNum(1);
  tgb.onName("中文😀非常长非常长非常长非常长非常长非常长非常长非常长.txt");
  tgb.onSize(1000 * 1024);
  tgb.onStep(100 * 1024);
  tgb.setTerminalColumns(100);
  tgb.onStep(200 * 1024);
  expect(writer.mock.calls.length).toBe(2);
  expect(dateNowSpy.mock.calls.length).toBe(3);
  expect(writer.mock.calls[0][0]).toContain("中文😀非常长非常长非常长非常长非常长非常长非常... [");
  expect(writer.mock.calls[0][0]).toContain("] 10% | 100 KB | 100 KB/s | 00:09 ETA");
  expect(outputLength(writer.mock.calls[0][0])).toBe(110);
  expect(writer.mock.calls[1][0]).toContain("中文😀非常长非常长非常长非常长非常长... [");
  expect(writer.mock.calls[1][0]).toContain("] 20% | 200 KB | 66.7 KB/s | 00:12 ETA");
  expect(outputLength(writer.mock.calls[1][0])).toBe(100);
});

test("progress bar no total size", () => {
  dateNowSpy.mockReturnValueOnce(1646564135000).mockReturnValueOnce(1646564136000).mockReturnValueOnce(1646564138000);
  const writer = jest.fn();
  const tgb = new TextProgressBar(writer, 95);
  tgb.onNum(1);
  tgb.onName("中文😀非常长非常长非常长非常长非常长非常长非常长非常长.txt");
  tgb.onSize(1000 * 1024 * 1024 * 1024);
  tgb.onStep(100 * 1024 * 1024);
  tgb.setTerminalColumns(85);
  tgb.onStep(200 * 1024 * 1024 * 1024);
  expect(writer.mock.calls.length).toBe(2);
  expect(dateNowSpy.mock.calls.length).toBe(3);
  expect(writer.mock.calls[0][0]).toContain("中文😀非常长非常长非常长非常长非常长... [");
  expect(writer.mock.calls[0][0]).toContain("] 0% | 100 MB/s | 2:50:39 ETA");
  expect(outputLength(writer.mock.calls[0][0])).toBe(95);
  expect(writer.mock.calls[1][0]).toContain("中文😀非常长非常长非常长非... [");
  expect(writer.mock.calls[1][0]).toContain("] 20% | 66.7 GB/s | 00:12 ETA");
  expect(outputLength(writer.mock.calls[1][0])).toBe(85);
});

test("progress bar no speed and eta", () => {
  dateNowSpy.mockReturnValueOnce(1646564135000).mockReturnValueOnce(1646564136000).mockReturnValueOnce(1646564138000);
  const writer = jest.fn();
  const tgb = new TextProgressBar(writer, 70);
  tgb.onNum(1);
  tgb.onName("中文😀longlonglonglonglonglongname.txt");
  tgb.onSize(1000);
  tgb.onStep(100);
  tgb.setTerminalColumns(60);
  tgb.onStep(200);
  expect(writer.mock.calls.length).toBe(2);
  expect(dateNowSpy.mock.calls.length).toBe(3);
  expect(writer.mock.calls[0][0]).toContain("中文😀longlonglonglonglongl... [");
  expect(writer.mock.calls[0][0]).toContain("] 10% | 00:09 ETA");
  expect(outputLength(writer.mock.calls[0][0])).toBe(70);
  expect(writer.mock.calls[1][0]).toContain("中文😀longlonglonglonglongl... [");
  expect(writer.mock.calls[1][0]).toContain("] 20%");
  expect(outputLength(writer.mock.calls[1][0])).toBe(60);
});

test("progress bar no file name", () => {
  dateNowSpy.mockReturnValueOnce(1646564135000).mockReturnValueOnce(1646564136000).mockReturnValueOnce(1646564138000);
  const writer = jest.fn();
  const tgb = new TextProgressBar(writer, 48);
  tgb.onNum(1);
  tgb.onName("中文😀llong文件名.txt");
  tgb.onSize(1000);
  tgb.onStep(100);
  tgb.setTerminalColumns(30);
  tgb.onStep(200);
  expect(writer.mock.calls.length).toBe(2);
  expect(dateNowSpy.mock.calls.length).toBe(3);
  expect(writer.mock.calls[0][0]).toContain("中文😀llong文件名... [");
  expect(writer.mock.calls[0][0]).toContain("] 10%");
  expect(outputLength(writer.mock.calls[0][0])).toBe(48);
  expect(writer.mock.calls[1][0]).not.toContain("中文");
  expect(writer.mock.calls[1][0]).toContain("] 20%");
  expect(outputLength(writer.mock.calls[1][0])).toBe(30);
});

test("progress bar no bar", () => {
  dateNowSpy.mockReturnValueOnce(1646564135000).mockReturnValueOnce(1646564136000);
  const writer = jest.fn();
  const tgb = new TextProgressBar(writer, 10);
  tgb.onNum(1);
  tgb.onName("中文😀test.txt");
  tgb.onSize(1000);
  tgb.onStep(300);
  expect(writer.mock.calls.length).toBe(1);
  expect(dateNowSpy.mock.calls.length).toBe(2);
  expect(writer.mock.calls[0][0].replace("\r", "")).toBe("30%");
});

test("progress bar multiple files", () => {
  dateNowSpy
    .mockReturnValueOnce(1646564135000)
    .mockReturnValueOnce(1646564136000)
    .mockReturnValueOnce(1646564137000)
    .mockReturnValueOnce(1646564139000);
  const writer = jest.fn();
  const tgb = new TextProgressBar(writer, 100);
  tgb.onNum(2);
  tgb.onName("中文😀test.txt");
  tgb.onSize(1000);
  tgb.onStep(100);
  tgb.onDone();
  tgb.onName("英文😀test.txt");
  tgb.onSize(2000);
  tgb.setTerminalColumns(80);
  tgb.onStep(300);
  tgb.onDone();
  expect(writer.mock.calls.length).toBe(4);
  expect(dateNowSpy.mock.calls.length).toBe(4);
  expect(writer.mock.calls[0][0]).toContain("(1/2) 中文😀test.txt [");
  expect(writer.mock.calls[0][0]).toContain("] 10% | 100 B | 100 B/s | 00:09 ETA");
  expect(outputLength(writer.mock.calls[0][0])).toBe(100);
  expect(writer.mock.calls[1][0]).toBe("\r");
  expect(writer.mock.calls[2][0]).toContain("(2/2) 英文😀test.txt [");
  expect(writer.mock.calls[2][0]).toContain("] 15% | 300 B | 150 B/s | 00:11 ETA");
  expect(outputLength(writer.mock.calls[2][0])).toBe(80);
  expect(writer.mock.calls[3][0]).toBe("\r");
});

test("progress bar in tmux pane", () => {
  dateNowSpy
    .mockReturnValueOnce(1646564135000)
    .mockReturnValueOnce(1646564136000)
    .mockReturnValueOnce(1646564137000)
    .mockReturnValueOnce(1646564138000)
    .mockReturnValueOnce(1646564139000);
  const writer = jest.fn();
  const tgb = new TextProgressBar(writer, 100, 80);
  tgb.onNum(2);
  tgb.onName("中文😀test.txt");
  tgb.onSize(1000);
  tgb.onStep(100);
  tgb.onStep(200);
  tgb.onDone();
  tgb.setTerminalColumns(120);
  tgb.onName("中文😀test2.txt");
  tgb.onSize(1000);
  tgb.onStep(300);
  tgb.onDone();

  expect(writer.mock.calls.length).toBe(5);
  expect(dateNowSpy.mock.calls.length).toBe(5);
  expect(writer.mock.calls[0][0]).not.toContain("\r");
  expect(writer.mock.calls[0][0]).not.toContain("\x1b[79D");
  expect(writer.mock.calls[0][0]).toContain("(1/2) 中文😀test.txt [");
  expect(writer.mock.calls[0][0]).toContain("] 10% | 100 B | 100 B/s | 00:09 ETA");
  expect(outputLength(writer.mock.calls[0][0])).toBe(79);

  expect(writer.mock.calls[1][0]).not.toContain("\r");
  expect(writer.mock.calls[1][0]).toContain("\x1b[79D");
  expect(writer.mock.calls[1][0]).toContain("(1/2) 中文😀test.txt [");
  expect(writer.mock.calls[1][0]).toContain("] 20% | 200 B | 100 B/s | 00:08 ETA");
  expect(outputLength(writer.mock.calls[1][0])).toBe(79);

  expect(writer.mock.calls[2][0]).not.toContain("\r");
  expect(writer.mock.calls[2][0]).toContain("\x1b[79D");

  expect(writer.mock.calls[3][0]).toContain("(2/2) 中文😀test2.txt [");
  expect(writer.mock.calls[3][0]).toContain("] 30% | 300 B | 300 B/s | 00:02 ETA");
  expect(outputLength(writer.mock.calls[3][0])).toBe(120);

  expect(writer.mock.calls[4][0]).toContain("\r");
  expect(writer.mock.calls[4][0]).not.toContain("\x1b[79D");
});

test("get substring with max length", () => {
  expect(getEllipsisString("", 10)).toStrictEqual({ sub: "...", len: 3 });
  expect(getEllipsisString("中文", 1)).toStrictEqual({ sub: "...", len: 3 });
  expect(getEllipsisString("中文", 5)).toStrictEqual({ sub: "中...", len: 5 });
  expect(getEllipsisString("😀中", 5)).toStrictEqual({ sub: "😀...", len: 5 });
  expect(getEllipsisString("😀中", 6)).toStrictEqual({ sub: "😀...", len: 5 });
  expect(getEllipsisString("😀中", 7)).toStrictEqual({ sub: "😀中...", len: 7 });
  expect(getEllipsisString("😀q中", 5)).toStrictEqual({ sub: "😀...", len: 5 });
  expect(getEllipsisString("😀a中", 6)).toStrictEqual({ sub: "😀a...", len: 6 });
  expect(getEllipsisString("😀a中", 7)).toStrictEqual({ sub: "😀a...", len: 6 });
  expect(getEllipsisString("😀a中", 8)).toStrictEqual({ sub: "😀a中...", len: 8 });
});
