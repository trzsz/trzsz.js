/**
 * trzsz: https://github.com/trzsz/trzsz.js
 * Copyright(c) 2022 Lonny Wong <lonnywong@qq.com>
 * @license MIT
 */

import { BrowserFileReader } from "./browser";

/* eslint-disable require-jsdoc */

async function parseDataTransferItem(
  pathId: number,
  item: FileSystemEntry,
  fileList: BrowserFileReader[],
  relPath: string[]
) {
  if (item.isFile) {
    await new Promise<void>((resolve) => {
      (item as FileSystemFileEntry).file((file) => {
        fileList.push(new BrowserFileReader(pathId, relPath, file, false));
        resolve();
      });
    });
  } else if (item.isDirectory) {
    fileList.push(new BrowserFileReader(pathId, relPath, null, true));
    await new Promise<void>((resolve) => {
      const dirReader = (item as FileSystemDirectoryEntry).createReader();
      dirReader.readEntries(async (entries) => {
        for (const entry of entries) {
          await parseDataTransferItem(pathId, entry, fileList, [...relPath, entry.name]);
        }
        resolve();
      });
    });
  }
}

export async function parseDataTransferItemList(items: DataTransferItemList) {
  const fileList: BrowserFileReader[] = [];
  const entries: FileSystemEntry[] = [];
  for (const item of items) {
    entries.push(item.webkitGetAsEntry());
  }
  for (let i = 0; i < entries.length; i++) {
    const item = entries[i];
    if (item) {
      await parseDataTransferItem(i, item, fileList, [item.name]);
    }
  }
  return fileList;
}
