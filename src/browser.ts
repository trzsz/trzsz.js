/**
 * trzsz: https://github.com/trzsz/trzsz.js
 * Copyright(c) 2022 Lonny Wong <lonnywong@qq.com>
 * @license MIT
 */

/* eslint-disable require-jsdoc */

export async function selectSendFiles() {
  if (!window.hasOwnProperty("showOpenFilePicker")) {
    return Promise.reject(
      new Error("The browser doesn't support the File System Access API.\nhttps://web.dev/file-system-access/")
    );
  }
  // @ts-ignore
  return window.showOpenFilePicker({ multiple: true });
}

export async function selectSaveFile(name: string) {
  if (!window.hasOwnProperty("showSaveFilePicker")) {
    return Promise.reject(
      new Error("The browser doesn't support the File System Access API.\nhttps://web.dev/file-system-access/")
    );
  }
  // @ts-ignore
  return window.showSaveFilePicker({ suggestedName: name });
}
