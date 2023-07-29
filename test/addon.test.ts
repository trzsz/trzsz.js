/**
 * trzsz: https://github.com/trzsz/trzsz.js
 * Copyright(c) 2022 Lonny Wong <lonnywong@qq.com>
 * @license MIT
 */

import * as comm from "../src/comm";
import * as browser from "../src/browser";
import { strToUint8 } from "../src/comm";
import { TrzszAddon } from "../src/addon";

/* eslint-disable require-jsdoc */

async function sleep(timeout: number) {
  return new Promise((resolve) => setTimeout(resolve, timeout));
}

afterEach(() => {
  // @ts-ignore
  comm.isRunningInBrowser = false;
});

class MockTerminal {
  public cols = 80;
  public write = jest.fn();
  public onDataCallback: Function;
  public onBinaryCallback: Function;
  public onResizeCallback: Function;
  public mockDispose = { dispose: jest.fn() };

  public onData(callback: Function) {
    this.onDataCallback = callback;
    return this.mockDispose;
  }

  public onBinary(callback: Function) {
    this.onBinaryCallback = callback;
    return this.mockDispose;
  }

  public onResize(callback: Function) {
    this.onResizeCallback = callback;
    return this.mockDispose;
  }
}

class MockWebSocket {
  public readyState = 0;
  public send = jest.fn();
  public listener = {};
  public addEventListener(type: string, callback: Function) {
    this.listener[type] = callback;
  }
  public removeEventListener(type: string, callback: Function) {
    if (this.listener[type] === callback) {
      delete this.listener[type];
    }
  }
}

test("trz upload files using addon", async () => {
  // @ts-ignore
  comm.isRunningInBrowser = true;
  const selectSendFiles = jest.spyOn(browser, "selectSendFiles");
  selectSendFiles.mockResolvedValueOnce([
    {
      getPathId: () => {
        return 0;
      },
      getRelPath: () => {
        return ["test.txt"];
      },
      isDir: () => {
        return false;
      },
      getSize: () => {
        return 13;
      },
      readFile: async () => {
        return strToUint8("test content\n");
      },
      closeFile: () => {},
    },
  ]);

  const ws = new MockWebSocket();
  const term = new MockTerminal();
  const addon = new TrzszAddon(ws as any);
  addon.activate(term as any);
  const onMessage = ws.listener["message"];

  term.onDataCallback("trz\n");
  expect(ws.send.mock.calls.length).toBe(0);

  ws.readyState = 1;
  onMessage({ data: strToUint8("::TRZSZ:TRANSFER" + ":R:1.0.0:0") });
  expect(term.write.mock.calls.length).toBe(1);
  expect(term.write.mock.calls[0][0]).toStrictEqual(strToUint8("::TRZSZ:TRANSFER" + ":R:1.0.0:0"));

  await sleep(100);
  onMessage({ data: "#CFG:eJyrVspJzEtXslJQKqhU0lFQSipNK86sSgUKGBqYWJiamwHFSjJzU/NLS8BiBrUAcT0OOQ==\n" });
  onMessage({ data: "#SUCC:1\n" });
  onMessage({ data: "#SUCC:eJwrSS0u0SupKNEzAAAWAwOt\n" });
  await sleep(100);
  term.onDataCallback("user input");
  term.onBinaryCallback("binary input");
  term.onResizeCallback({ cols: 100 });
  onMessage({ data: "#SUCC:13\n" });
  onMessage({ data: "#SUCC:13\n" });
  onMessage({ data: "#SUCC:eJy79tqIQ6ZJ72rRdtb0pty5cwE+YAdb\n" });

  await sleep(500);
  expect(selectSendFiles.mock.calls.length).toBe(1);

  expect(ws.send.mock.calls.length).toBe(7);
  expect(ws.send.mock.calls[0][0]).toContain("#ACT:");
  expect(ws.send.mock.calls[1][0]).toBe("#NUM:1\n");
  expect(ws.send.mock.calls[2][0]).toBe("#NAME:eJwrSS0u0SupKAEADtkDTw==\n");
  expect(ws.send.mock.calls[3][0]).toBe("#SIZE:13\n");
  expect(ws.send.mock.calls[4][0]).toBe("#DATA:eJwrSS0uUUjOzytJzSvhAgAkDwTm\n");
  expect(ws.send.mock.calls[5][0]).toBe("#MD5:eJy79tqIQ6ZJ72rRdtb0pty5cwE+YAdb\n");
  expect(ws.send.mock.calls[6][0]).toBe("#EXIT:eJwLTixLTVEwVEjLzEnVT8ksSk0uyS+q5OXSVShJLS7RK6ko0TMAAOH+DBk=\n");

  onMessage({ data: "Received test.txt.0 to /tmp\n" });

  expect(term.write.mock.calls.length).toBe(4);
  expect(term.write.mock.calls[1][0]).toContain("test.txt [");
  expect(term.write.mock.calls[2][0]).toContain("test.txt [");
  expect(term.write.mock.calls[3][0]).toBe("Received test.txt.0 to /tmp\n");

  ws.listener["close"]();
  expect(term.mockDispose.dispose.mock.calls.length).toBe(3);
  expect(JSON.stringify(ws.listener)).toBe("{}");

  selectSendFiles.mockRestore();
});

test("tsz download files using addon", async () => {
  // @ts-ignore
  comm.isRunningInBrowser = true;
  const selectSaveDirectory = jest.spyOn(browser, "selectSaveDirectory");
  const openSaveFile = jest.spyOn(browser, "openSaveFile");
  const handle = {
    kind: "directory",
    name: "tmp",
  };
  const file = {
    closeFile: jest.fn(),
    getLocalName: jest.fn(),
    writeFile: jest.fn(),
    getFileName: () => "test.txt",
    isDir: () => false,
  };
  file.getLocalName.mockReturnValueOnce("test.txt.0");
  selectSaveDirectory.mockReturnValueOnce(handle as any);
  openSaveFile.mockResolvedValueOnce(file as any);

  const ws = new MockWebSocket();
  const term = new MockTerminal();
  const addon = new TrzszAddon(ws as any, { terminalColumns: 10 });
  addon.activate(term as any);
  const onMessage = ws.listener["message"];

  term.onDataCallback("tsz\n");
  expect(ws.send.mock.calls.length).toBe(0);

  ws.readyState = 1;
  onMessage({ data: strToUint8("::TRZSZ:TRANSFER" + ":S:1.0.0:0") });
  expect(term.write.mock.calls.length).toBe(1);
  expect(term.write.mock.calls[0][0]).toStrictEqual(strToUint8("::TRZSZ:TRANSFER" + ":S:1.0.0:0"));

  await sleep(100);
  onMessage({
    data: "#CFG:eJyrVspJzEtXslJQKqhU0lFQSipNK86sSgUKGBqYWJiamwHFSjJzU/NLS8BiBiB+bmlFPFCgoLQkPqs0LxsoUVJUmloLAF6AF9g=\n",
  });
  onMessage({ data: "#NUM:1\n" });
  onMessage({ data: "#NAME:eJwrSS0u0SupKAEADtkDTw==\n" });
  await sleep(100);
  term.onDataCallback("user input");
  term.onBinaryCallback("binary input");
  term.onResizeCallback({ cols: 100 });
  onMessage({ data: "#SIZE:13\n" });
  onMessage({ data: "#DATA:eJwrSS0uUUjOzytJzSvhAgAkDwTm\n" });
  onMessage({ data: "#MD5:eJy79tqIQ6ZJ72rRdtb0pty5cwE+YAdb\n" });

  await sleep(500);
  expect(selectSaveDirectory.mock.calls.length).toBe(1);
  expect(openSaveFile.mock.calls.length).toBe(1);
  expect(openSaveFile.mock.calls[0][1]).toBe("test.txt");

  expect(ws.send.mock.calls.length).toBe(7);
  expect(ws.send.mock.calls[0][0]).toContain("#ACT:");
  expect(ws.send.mock.calls[1][0]).toBe("#SUCC:1\n");
  expect(ws.send.mock.calls[2][0]).toBe("#SUCC:eJwrSS0u0SupKNEzAAAWAwOt\n");
  expect(ws.send.mock.calls[3][0]).toBe("#SUCC:13\n");
  expect(ws.send.mock.calls[4][0]).toBe("#SUCC:13\n");
  expect(ws.send.mock.calls[5][0]).toBe("#SUCC:eJy79tqIQ6ZJ72rRdtb0pty5cwE+YAdb\n");
  expect(ws.send.mock.calls[6][0]).toContain("#EXIT:");

  onMessage({ data: "Saved test.txt.0 to /tmp\n" });

  expect(term.write.mock.calls.length).toBe(4);
  expect(term.write.mock.calls[1][0]).toContain("test.txt [");
  expect(term.write.mock.calls[2][0]).toContain("test.txt [");
  expect(term.write.mock.calls[3][0]).toBe("Saved test.txt.0 to /tmp\n");

  expect(file.closeFile.mock.calls.length).toBeGreaterThanOrEqual(1);
  expect(file.getLocalName.mock.calls.length).toBeGreaterThanOrEqual(1);
  expect(file.writeFile.mock.calls.length).toBe(1);
  expect(file.writeFile.mock.calls[0][0]).toStrictEqual(strToUint8("test content\n"));

  ws.listener["error"]();
  expect(term.mockDispose.dispose.mock.calls.length).toBe(3);
  expect(JSON.stringify(ws.listener)).toBe("{}");

  openSaveFile.mockRestore();
});

test("dispose undefined handler of websocket", () => {
  const ws = new MockWebSocket();
  const rmMock = jest.spyOn(ws, "removeEventListener").mockImplementation();
  const addon: any = new TrzszAddon(ws as any);
  const d = addon.addSocketListener(ws, "undefined", undefined);
  d.dispose();
  expect(rmMock.mock.calls.length).toBe(0);
});
