/**
 * trzsz: https://github.com/trzsz/trzsz.js
 * Copyright(c) 2022 Lonny Wong <lonnywong@qq.com>
 * @license MIT
 */

// @ts-nocheck

import { File } from "web-file-polyfill";
import { strToUint8 } from "../src/comm";
import { selectSendFiles, openSaveFile, defaultRequireUserPermission } from "../src/browser";

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

test("doesn't support the File System Access API", async () => {
  delete window.showOpenFilePicker;
  await expect(selectSendFiles()).rejects.toThrowError("File System Access API");
  delete window.showSaveFilePicker;
  await expect(openSaveFile("", "", false)).rejects.toThrowError("File System Access API");
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

  expect(tfr.getName()).toBe("test.txt");
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

  expect(tfr.getName()).toBe("test.txt");
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

test("showSaveFilePicker user cancel", async () => {
  window.showSaveFilePicker = jest.fn();
  const abortError = new Error("user cancelled");
  abortError.name = "AbortError";
  window.showSaveFilePicker.mockRejectedValue(abortError);
  await expect(openSaveFile("", "", false)).rejects.toThrowError("user cancelled");
  window.showSaveFilePicker.mockRejectedValue(new Error("other error"));
  await expect(openSaveFile("", "", false)).rejects.toThrowError("other error");
  expect(window.showSaveFilePicker.mock.calls.length).toBe(2);
});

test("showSaveFilePicker and write", async () => {
  const file = new File([""], "test.txt", { type: "text/plain" });
  const mockFileStream = {
    write: jest.fn(),
    close: jest.fn(),
  };
  window.showSaveFilePicker = jest.fn();
  window.showSaveFilePicker.mockReturnValueOnce({
    getFile: async () => file,
    createWritable: async () => mockFileStream,
  });

  const tfr = await openSaveFile("", "", false);

  expect(tfr.getName()).toBe("test.txt");

  const buf = strToUint8("test file content");
  await tfr.writeFile(buf);
  expect(mockFileStream.write.mock.calls.length).toBe(1);
  expect(mockFileStream.write.mock.calls[0][0]).toBe(buf);

  tfr.closeFile();
  expect(mockFileStream.close.mock.calls.length).toBe(1);
});

test("showSaveFilePicker no user permission", async () => {
  window.showSaveFilePicker = jest.fn();
  const securityError = new Error("user gesture");
  securityError.name = "SecurityError";
  window.showSaveFilePicker.mockRejectedValueOnce(securityError);
  setTimeout(() => document.body.click(), 200);
  const mockRequireUserPermission = jest.fn();
  mockRequireUserPermission.mockReturnValueOnce(false);
  await expect(openSaveFile(mockRequireUserPermission, "test.txt", false)).rejects.toThrowError("Cancelled");
  expect(window.showSaveFilePicker.mock.calls.length).toBe(1);
  expect(mockRequireUserPermission.mock.calls.length).toBe(1);
  expect(mockRequireUserPermission.mock.calls[0][0]).toBe("test.txt");
});

test("showSaveFilePicker require user permission", async () => {
  window.showSaveFilePicker = jest.fn();
  const securityError = new Error("user gesture");
  securityError.name = "SecurityError";
  const abortError = new Error("user cancelled");
  abortError.name = "AbortError";
  window.showSaveFilePicker.mockRejectedValueOnce(securityError).mockRejectedValueOnce(abortError);
  setTimeout(() => document.body.click(), 200);
  await expect(openSaveFile(defaultRequireUserPermission, "test.txt", false)).rejects.toThrowError("user cancelle");
  expect(window.showSaveFilePicker.mock.calls.length).toBe(2);
});

test("showSaveFilePicker having user permission and fail", async () => {
  window.showSaveFilePicker = jest.fn();
  const securityError = new Error("user gesture");
  securityError.name = "SecurityError";
  window.showSaveFilePicker.mockRejectedValueOnce(securityError).mockRejectedValueOnce(securityError);
  setTimeout(() => document.dispatchEvent(new KeyboardEvent("keypress", { keyCode: 0x20 })), 200);
  await expect(openSaveFile(defaultRequireUserPermission, "test.txt", false)).rejects.toThrowError(
    "No permission to call the File System Access API"
  );

  const otherError = new Error("other error");
  window.showSaveFilePicker.mockRejectedValueOnce(securityError).mockRejectedValueOnce(otherError);
  setTimeout(() => document.dispatchEvent(new KeyboardEvent("keypress", { keyCode: 0x20 })), 200);
  await expect(openSaveFile(defaultRequireUserPermission, "test.txt", false)).rejects.toThrowError("other error");

  expect(window.showSaveFilePicker.mock.calls.length).toBe(4);
});
