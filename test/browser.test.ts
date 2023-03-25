/**
 * trzsz: https://github.com/trzsz/trzsz.js
 * Copyright(c) 2023 Lonny Wong <lonnywong@qq.com>
 * @license MIT
 */

// @ts-nocheck

import { File } from "web-file-polyfill";
import { strToUint8 } from "../src/comm";
import { selectSendFiles, selectSendDirectories, selectSaveDirectory, openSaveFile } from "../src/browser";

const showOpenFilePicker = window.showOpenFilePicker;
const showSaveFilePicker = window.showSaveFilePicker;

afterAll(() => {
  if (!showOpenFilePicker) {
    delete window.showOpenFilePicker;
  } else {
    window.showOpenFilePicker = showOpenFilePicker;
  }
  if (!showSaveFilePicker) {
    delete window.showSaveFilePicker;
  } else {
    window.showSaveFilePicker = showSaveFilePicker;
  }
});

test("browser doesn't support", async () => {
  delete window.showOpenFilePicker;
  await expect(selectSendFiles()).rejects.toThrowError("File System Access API");
  delete window.showDirectoryPicker;
  await expect(selectSendDirectories()).rejects.toThrowError("File System Access API");
  await expect(selectSaveDirectory()).rejects.toThrowError("File System Access API");
});

test("showOpenFilePicker return null", async () => {
  window.showOpenFilePicker = jest.fn();
  window.showOpenFilePicker.mockReturnValueOnce(undefined).mockReturnValueOnce([]);
  expect(await selectSendFiles()).toBe(undefined);
  expect(await selectSendFiles()).toBe(undefined);
  expect(window.showOpenFilePicker.mock.calls.length).toBe(2);
});

test("showOpenFilePicker user cancel", async () => {
  window.showOpenFilePicker = jest.fn();
  const abortError = new Error("user cancelled");
  abortError.name = "AbortError";
  window.showOpenFilePicker.mockRejectedValue(abortError);
  expect(await selectSendFiles()).toBe(undefined);
  window.showOpenFilePicker.mockRejectedValue(new Error("other error"));
  await expect(selectSendFiles()).rejects.toThrowError("other error");
  expect(window.showOpenFilePicker.mock.calls.length).toBe(2);
});

test("showOpenFilePicker and read", async () => {
  const file = new File(["test file content"], "test.txt", { type: "text/plain" });
  window.showOpenFilePicker = jest.fn();
  window.showOpenFilePicker.mockReturnValueOnce([{ getFile: async () => file }]);

  const tfr = (await selectSendFiles())[0];

  expect(tfr.getPathId()).toBe(0);
  expect(tfr.getRelPath()).toStrictEqual(["test.txt"]);
  expect(tfr.isDir()).toBe(false);
  expect(tfr.getSize()).toBe(17);

  let buf = new ArrayBuffer(4);
  expect(await tfr.readFile(buf)).toStrictEqual(strToUint8("test"));
  buf = new ArrayBuffer(1);
  expect(await tfr.readFile(buf)).toStrictEqual(strToUint8(" "));
  buf = new ArrayBuffer("file content".length);
  expect(await tfr.readFile(buf)).toStrictEqual(strToUint8("file content"));
  expect(await tfr.readFile(buf)).toStrictEqual(strToUint8(""));

  tfr.closeFile();
});

test("showOpenFilePicker and no permission", async () => {
  const file = new File(["test file content"], "test.txt", { type: "text/plain" });
  window.showOpenFilePicker = jest.fn();
  window.showOpenFilePicker.mockReturnValueOnce([{ getFile: async () => file }]);

  const tfr = (await selectSendFiles())[0];

  expect(tfr.getPathId()).toBe(0);
  expect(tfr.getRelPath()).toStrictEqual(["test.txt"]);
  expect(tfr.isDir()).toBe(false);
  expect(tfr.getSize()).toBe(17);

  const abMock = jest.fn().mockRejectedValueOnce(new Error("error"));
  const fileMock = jest.spyOn(file, "slice").mockReturnValueOnce({
    arrayBuffer: abMock,
  });

  const buf = new ArrayBuffer(17);
  await expect(tfr.readFile(buf)).rejects.toThrowError("error");

  fileMock.mockRestore();
  tfr.closeFile();
});
