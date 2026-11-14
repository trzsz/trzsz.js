/** @jest-environment node */
/**
 * trzsz: https://github.com/trzsz/trzsz.js
 * Copyright(c) 2022-2026 Lonny Wong <lonnywong@qq.com>
 * @license MIT
 */

import { Terminal } from "@xterm/xterm";
import { Unicode11Addon } from "@xterm/addon-unicode11";
import { TextProgressBar, getEllipsisString } from "../src/progress";

/* eslint-disable require-jsdoc */

function terminal(columns: number): Terminal {
  const term = new Terminal({ cols: columns, rows: 10, allowProposedApi: true });
  term.loadAddon(new Unicode11Addon());
  term.unicode.activeVersion = "11";
  return term;
}

async function write(term: Terminal, data: string): Promise<void> {
  await new Promise<void>((resolve) => term.write(data, resolve));
}

const fileNames = [
  "192.168.194.216.har",
  "《杨义文存第五卷：鲁迅作品综论》.pdf",
  "全角ＡＢＣ，。！？「日本語」한글.txt",
  "文件😀𠀀㐀.txt",
  "cafe\u0301-👨‍👩‍👧.txt",
  "《很长的中文：文件名😀𠀀》".repeat(20) + ".pdf",
];

test.each([60, 80, 120, 160, 240])("Unicode progress keeps updating on one xterm row at %i columns", async (columns) => {
  let now = 1646564135000;
  const dateNowSpy = jest.spyOn(Date, "now").mockImplementation(() => now);
  try {
    for (const fileName of fileNames) {
      const writer = jest.fn();
      const bar = new TextProgressBar(writer, columns);
      bar.onNum(12);
      bar.onName(fileName);
      bar.onSize(10 * 1024 * 1024);
      for (let i = 0; i < 5; i++) {
        now += 250;
        bar.onStep(i * 10000);
      }
      expect(writer).toHaveBeenCalledTimes(5);
      const term = terminal(columns);
      try {
        for (const [frame] of writer.mock.calls) {
          await write(term, frame);
          expect({ fileName, row: term.buffer.active.cursorY }).toEqual({ fileName, row: 0 });
        }
        if (columns >= 160) {
          expect(term.buffer.active.getLine(0)?.translateToString(true)).toMatch(/ ETA$/);
        }
      } finally {
        term.dispose();
      }
    }
  } finally {
    dateNowSpy.mockRestore();
  }
});

test.each([
  ["《书：》.pdf", 10, { sub: "《书：...", len: 9 }],
  ["a😀b", 4, { sub: "a...", len: 4 }],
  ["a😀b", 5, { sub: "a...", len: 4 }],
  ["a😀b", 6, { sub: "a😀...", len: 6 }],
  ["𠀀㐀한Ａ.txt", 8, { sub: "𠀀㐀...", len: 7 }],
  ["e\u0301xyz", 4, { sub: "e\u0301...", len: 4 }],
] as const)("Unicode truncation of %s fits %i columns", (name, columns, expected) => {
  expect(getEllipsisString(name, columns)).toEqual(expected);
});

test("truncated filename lengths agree with xterm and preserve Unicode code points", async () => {
  const term = terminal(1024);
  try {
    for (const fileName of fileNames) {
      for (const columns of [3, 4, 5, 6, 7, 10, 20, 30, 40, 50]) {
        const { sub, len } = getEllipsisString(fileName, columns);
        expect(len).toBeLessThanOrEqual(columns);
        expect(Buffer.from(sub).toString()).toBe(sub);
        await write(term, "\r" + sub);
        expect(term.buffer.active.cursorX).toBe(len);
      }
    }
  } finally {
    term.dispose();
  }
});
