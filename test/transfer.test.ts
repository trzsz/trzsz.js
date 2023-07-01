/**
 * trzsz: https://github.com/trzsz/trzsz.js
 * Copyright(c) 2023 Lonny Wong <lonnywong@qq.com>
 * @license MIT
 */

import { getEscapeChars } from "../src/escape";
import { TrzszTransfer } from "../src/transfer";
import { strToUint8, uint8ToStr, decodeBuffer, TmuxMode, TrzszError } from "../src/comm";

/* eslint-disable require-jsdoc */

async function sleep(timeout: number) {
  return new Promise((resolve) => setTimeout(resolve, timeout));
}

test("upload files using base64 mode", async () => {
  const file = {
    closeFile: jest.fn(),
    getPathId: () => 0,
    getRelPath: jest.fn(),
    isDir: () => false,
    getSize: jest.fn(),
    readFile: jest.fn(),
  };
  const progress = {
    onNum: jest.fn(),
    onName: jest.fn(),
    onSize: jest.fn(),
    onStep: jest.fn(),
    onDone: jest.fn(),
  };
  const writer = jest.fn();
  const trzsz = new TrzszTransfer(writer);

  file.getRelPath.mockReturnValueOnce(["test.txt"]);
  file.getSize.mockReturnValueOnce(13);
  file.readFile.mockReturnValueOnce(strToUint8("test content\n"));

  setTimeout(async () => {
    expect(writer.mock.calls.length).toBe(1);
    expect(writer.mock.calls[0][0]).toBe("#NUM:1\n");

    trzsz.addReceivedData("#SUCC:1\n");
    await sleep(100);

    expect(progress.onNum.mock.calls.length).toBe(1);
    expect(progress.onNum.mock.calls[0][0]).toBe(1);

    expect(writer.mock.calls.length).toBe(2);
    expect(writer.mock.calls[1][0]).toBe("#NAME:eJwrSS0u0SupKAEADtkDTw==\n");

    trzsz.addReceivedData("#SUCC:eJwrSS0u0SupKNEzAAAWAwOt\n");
    await sleep(100);

    expect(progress.onName.mock.calls.length).toBe(1);
    expect(progress.onName.mock.calls[0][0]).toBe("test.txt");
    expect(writer.mock.calls.length).toBe(3);
    expect(writer.mock.calls[2][0]).toBe("#SIZE:13\n");

    trzsz.addReceivedData("#SUCC:13\n");
    await sleep(100);

    expect(progress.onSize.mock.calls.length).toBe(1);
    expect(progress.onSize.mock.calls[0][0]).toBe(13);
    expect(writer.mock.calls.length).toBe(4);
    expect(writer.mock.calls[3][0]).toBe("#DATA:eJwrSS0uUUjOzytJzSvhAgAkDwTm\n");

    trzsz.addReceivedData("#SUCC:13\n");
    await sleep(100);

    expect(progress.onStep.mock.calls.length).toBe(2);
    expect(progress.onStep.mock.calls[0][0]).toBe(0);
    expect(progress.onStep.mock.calls[1][0]).toBe(13);
    expect(writer.mock.calls.length).toBe(5);
    expect(writer.mock.calls[4][0]).toBe("#MD5:eJy79tqIQ6ZJ72rRdtb0pty5cwE+YAdb\n");

    trzsz.addReceivedData("#SUCC:eJy79tqIQ6ZJ72rRdtb0pty5cwE+YAdb\n");
    await sleep(100);

    expect(progress.onDone.mock.calls.length).toBe(1);
  }, 100);

  const remoteNames = await trzsz.sendFiles([file], progress);
  expect(remoteNames.length).toBe(1);
  expect(remoteNames[0]).toBe("test.txt.0");

  expect(file.getRelPath.mock.calls.length).toBe(1);
  expect(file.getSize.mock.calls.length).toBe(1);
  expect(file.readFile.mock.calls.length).toBe(1);
  expect(file.closeFile.mock.calls.length).toBe(1);
});

test("upload files using binary mode", async () => {
  const file = {
    closeFile: jest.fn(),
    getPathId: () => 0,
    getRelPath: jest.fn(),
    isDir: () => false,
    getSize: jest.fn(),
    readFile: jest.fn(),
  };
  const progress = {
    onNum: jest.fn(),
    onName: jest.fn(),
    onSize: jest.fn(),
    onStep: jest.fn(),
    onDone: jest.fn(),
  };
  const writer = jest.fn();
  const trzsz = new TrzszTransfer(writer);

  file.getRelPath.mockReturnValueOnce(["binary.txt"]);
  file.getSize.mockReturnValueOnce(11);
  file.readFile.mockReturnValueOnce(strToUint8("\x00\x01\x02\x03\x04\x05\x06\x07\x08\x09\x0A"));

  trzsz.addReceivedData(
    "junk\r\n#CFG:eJxNzzsOwjAMgOGrRJ47OBULbLxOESKUFgORoFR5DAXB2XEokrP5/+TBfsHNDRdYKRgnaBR0fnBh4k4hEzfF3o10" +
      "7K8uRFZj4JARicruPP3bNsrAR1jPUgJb4bWwRuFNxZ3wtuKT8E54WfEerC0v5HP0T+JrNbYLhuTv9MjpB/j+AivBQi0=\n"
  );
  const config = await trzsz.recvConfig();
  expect(config.binary).toBe(true);
  expect(config.bufsize).toBe(1024);
  expect(config.escape_chars).toStrictEqual(getEscapeChars(true));

  setTimeout(async () => {
    expect(writer.mock.calls.length).toBe(1);
    expect(writer.mock.calls[0][0]).toBe("#NUM:1\n");

    trzsz.addReceivedData("#SUCC:1\n");
    await sleep(100);

    expect(progress.onNum.mock.calls.length).toBe(1);
    expect(progress.onNum.mock.calls[0][0]).toBe(1);

    expect(writer.mock.calls.length).toBe(2);
    expect(writer.mock.calls[1][0]).toBe("#NAME:eJxLysxLLKrUK6koAQAWJwQU\n");

    trzsz.addReceivedData("#SUCC:eJxLysxLLKrUK6ko0TMAAB7bBHI=\n");
    await sleep(100);

    expect(progress.onName.mock.calls.length).toBe(1);
    expect(progress.onName.mock.calls[0][0]).toBe("binary.txt");
    expect(writer.mock.calls.length).toBe(3);
    expect(writer.mock.calls[2][0]).toBe("#SIZE:11\n");

    trzsz.addReceivedData("#SUCC:11\n");
    await sleep(100);

    expect(progress.onSize.mock.calls.length).toBe(1);
    expect(progress.onSize.mock.calls[0][0]).toBe(11);
    expect(writer.mock.calls.length).toBe(5);
    expect(writer.mock.calls[3][0]).toBe("#DATA:12\n");
    expect(writer.mock.calls[4][0]).toStrictEqual(strToUint8("\x00\x01\xeeA\x03\x04\x05\x06\x07\x08\x09\x0A"));

    trzsz.addReceivedData("#SUCC:11\n");
    await sleep(100);

    expect(progress.onStep.mock.calls.length).toBe(2);
    expect(progress.onStep.mock.calls[0][0]).toBe(0);
    expect(progress.onStep.mock.calls[1][0]).toBe(11);
    expect(writer.mock.calls.length).toBe(6);
    expect(writer.mock.calls[5][0]).toBe("#MD5:eJyLbvvVdeOLad0ScUXHJvHqFwBJWwf+\n");

    trzsz.addReceivedData("#SUCC:eJyLbvvVdeOLad0ScUXHJvHqFwBJWwf+\n");
    await sleep(100);

    expect(progress.onDone.mock.calls.length).toBe(1);
  }, 100);

  const remoteNames = await trzsz.sendFiles([file], progress);
  expect(remoteNames.length).toBe(1);
  expect(remoteNames[0]).toBe("binary.txt.0");

  expect(file.getRelPath.mock.calls.length).toBe(1);
  expect(file.getSize.mock.calls.length).toBe(1);
  expect(file.readFile.mock.calls.length).toBe(1);
  expect(file.closeFile.mock.calls.length).toBe(1);
});

test("download files using base64 mode", async () => {
  const file = {
    closeFile: jest.fn(),
    getLocalName: jest.fn(),
    writeFile: jest.fn(),
    getFileName: () => "test.txt",
    isDir: () => false,
  };
  const progress = {
    onNum: jest.fn(),
    onName: jest.fn(),
    onSize: jest.fn(),
    onStep: jest.fn(),
    onDone: jest.fn(),
  };
  const writer = jest.fn();
  const trzsz = new TrzszTransfer(writer);

  const openSaveFile = jest.fn();
  openSaveFile.mockReturnValueOnce(file);
  file.getLocalName.mockReturnValue("test.txt.0");

  setTimeout(async () => {
    trzsz.addReceivedData("#NUM:1\n");
    await sleep(100);

    expect(writer.mock.calls.length).toBe(1);
    expect(writer.mock.calls[0][0]).toBe("#SUCC:1\n");
    expect(progress.onNum.mock.calls.length).toBe(1);
    expect(progress.onNum.mock.calls[0][0]).toBe(1);

    trzsz.addReceivedData("#NAME:eJwrSS0u0SupKAEADtkDTw==\n");
    await sleep(100);

    expect(writer.mock.calls.length).toBe(2);
    expect(writer.mock.calls[1][0]).toBe("#SUCC:eJwrSS0u0SupKNEzAAAWAwOt\n");
    expect(progress.onName.mock.calls.length).toBe(1);
    expect(progress.onName.mock.calls[0][0]).toBe("test.txt");

    trzsz.addReceivedData("#SIZE:13\n");
    await sleep(100);

    expect(writer.mock.calls.length).toBe(3);
    expect(writer.mock.calls[2][0]).toBe("#SUCC:13\n");
    expect(progress.onSize.mock.calls.length).toBe(1);
    expect(progress.onSize.mock.calls[0][0]).toBe(13);

    trzsz.addReceivedData("#DATA:eJwrSS0uUUjOzytJzSvhAgAkDwTm\n");
    await sleep(100);

    expect(progress.onStep.mock.calls.length).toBe(2);
    expect(progress.onStep.mock.calls[0][0]).toBe(0);
    expect(progress.onStep.mock.calls[1][0]).toBe(13);
    expect(writer.mock.calls.length).toBe(4);
    expect(writer.mock.calls[3][0]).toBe("#SUCC:13\n");

    trzsz.addReceivedData("#MD5:eJy79tqIQ6ZJ72rRdtb0pty5cwE+YAdb\n");
    await sleep(100);

    expect(writer.mock.calls.length).toBe(5);
    expect(writer.mock.calls[4][0]).toBe("#SUCC:eJy79tqIQ6ZJ72rRdtb0pty5cwE+YAdb\n");
    expect(progress.onDone.mock.calls.length).toBe(1);
  }, 100);

  const localNames = await trzsz.recvFiles("param", openSaveFile, progress);
  expect(localNames.length).toBe(1);
  expect(localNames[0]).toBe("test.txt.0");

  expect(openSaveFile.mock.calls.length).toBe(1);
  expect(openSaveFile.mock.calls[0][0]).toBe("param");
  expect(openSaveFile.mock.calls[0][1]).toBe("test.txt");
  expect(openSaveFile.mock.calls[0][2]).toBe(false);

  expect(file.getLocalName.mock.calls.length).toBeGreaterThan(1);
  expect(file.writeFile.mock.calls.length).toBe(1);
  expect(file.writeFile.mock.calls[0][0]).toStrictEqual(strToUint8("test content\n"));
  expect(file.closeFile.mock.calls.length).toBe(1);
});

test("download files using binary mode", async () => {
  const file = {
    closeFile: jest.fn(),
    getLocalName: jest.fn(),
    writeFile: jest.fn(),
    getFileName: () => "binary.txt",
    isDir: () => false,
  };
  const progress = {
    onNum: jest.fn(),
    onName: jest.fn(),
    onSize: jest.fn(),
    onStep: jest.fn(),
    onDone: jest.fn(),
  };
  const writer = jest.fn();
  const trzsz = new TrzszTransfer(writer);

  trzsz.addReceivedData(
    "junk\r\n#CFG:eJxNzzsOwjAMgOGrRJ47OBULbLxOESKUFgORoFR5DAXB2XEokrP5/+TBfsHNDRdYKRgnaBR0fnBh4k4hEzfF3o10" +
      "7K8uRFZj4JARicruPP3bNsrAR1jPUgJb4bWwRuFNxZ3wtuKT8E54WfEerC0v5HP0T+JrNbYLhuTv9MjpB/j+AivBQi0=\n"
  );
  const config = await trzsz.recvConfig();
  expect(config.binary).toBe(true);
  expect(config.bufsize).toBe(1024);
  expect(config.escape_chars).toStrictEqual(getEscapeChars(true));

  const openSaveFile = jest.fn();
  openSaveFile.mockReturnValueOnce(file);
  file.getLocalName.mockReturnValue("binary.txt.0");

  setTimeout(async () => {
    trzsz.addReceivedData("#NUM:1\n");
    await sleep(100);

    expect(writer.mock.calls.length).toBe(1);
    expect(writer.mock.calls[0][0]).toBe("#SUCC:1\n");
    expect(progress.onNum.mock.calls.length).toBe(1);
    expect(progress.onNum.mock.calls[0][0]).toBe(1);

    trzsz.addReceivedData("#NAME:eJxLysxLLKrUK6koAQAWJwQU\n");
    await sleep(100);

    expect(writer.mock.calls.length).toBe(2);
    expect(writer.mock.calls[1][0]).toBe("#SUCC:eJxLysxLLKrUK6ko0TMAAB7bBHI=\n");
    expect(progress.onName.mock.calls.length).toBe(1);
    expect(progress.onName.mock.calls[0][0]).toBe("binary.txt");

    trzsz.addReceivedData("#SIZE:11\n");
    await sleep(100);

    expect(writer.mock.calls.length).toBe(3);
    expect(writer.mock.calls[2][0]).toBe("#SUCC:11\n");
    expect(progress.onSize.mock.calls.length).toBe(1);
    expect(progress.onSize.mock.calls[0][0]).toBe(11);

    trzsz.addReceivedData("#DATA:12\n");
    trzsz.addReceivedData(strToUint8("\x00\x01\xeeA\x03\x04\x05\x06\x07\x08\x09\x0A"));
    await sleep(100);

    expect(progress.onStep.mock.calls.length).toBe(2);
    expect(progress.onStep.mock.calls[0][0]).toBe(0);
    expect(progress.onStep.mock.calls[1][0]).toBe(11);
    expect(writer.mock.calls.length).toBe(4);
    expect(writer.mock.calls[3][0]).toBe("#SUCC:11\n");

    trzsz.addReceivedData("#MD5:eJyLbvvVdeOLad0ScUXHJvHqFwBJWwf+\n");
    await sleep(100);

    expect(writer.mock.calls.length).toBe(5);
    expect(writer.mock.calls[4][0]).toBe("#SUCC:eJyLbvvVdeOLad0ScUXHJvHqFwBJWwf+\n");
    expect(progress.onDone.mock.calls.length).toBe(1);
  }, 100);

  const localNames = await trzsz.recvFiles("param", openSaveFile, progress);
  expect(localNames.length).toBe(1);
  expect(localNames[0]).toBe("binary.txt.0");

  expect(openSaveFile.mock.calls.length).toBe(1);
  expect(openSaveFile.mock.calls[0][0]).toBe("param");
  expect(openSaveFile.mock.calls[0][1]).toBe("binary.txt");
  expect(openSaveFile.mock.calls[0][2]).toBe(false);

  expect(file.getLocalName.mock.calls.length).toBeGreaterThan(1);
  expect(file.writeFile.mock.calls.length).toBe(1);
  expect(file.writeFile.mock.calls[0][0]).toStrictEqual(strToUint8("\x00\x01\x02\x03\x04\x05\x06\x07\x08\x09\x0A"));
  expect(file.closeFile.mock.calls.length).toBe(1);
});

test("download files md5 invalid", async () => {
  const file = {
    closeFile: jest.fn(),
    getLocalName: jest.fn(),
    writeFile: jest.fn(),
    getFileName: () => "test.txt",
    isDir: () => false,
  };
  const writer = jest.fn();
  const openSaveFile = jest.fn();
  openSaveFile.mockReturnValueOnce(file);
  file.getLocalName.mockReturnValue("test.txt.0");

  const trzsz = new TrzszTransfer(writer);
  trzsz.addReceivedData("#NUM:1\n");
  trzsz.addReceivedData("#NAME:eJwrSS0u0SupKAEADtkDTw==\n");
  trzsz.addReceivedData("#SIZE:13\n");
  trzsz.addReceivedData("#DATA:eJwrSS0uUUjOzytJzSvhAgAkDwTm\n");
  trzsz.addReceivedData("#MD5:eJwzNDI2MTUzt7AEAAkeAd4=\n");

  await expect(trzsz.recvFiles("/tmp", openSaveFile, null)).rejects.toThrowError("MD5");
});

test("download files md5 not match", async () => {
  const file = {
    closeFile: jest.fn(),
    getLocalName: jest.fn(),
    writeFile: jest.fn(),
    getFileName: () => "test.txt",
    isDir: () => false,
  };
  const writer = jest.fn();
  const openSaveFile = jest.fn();
  openSaveFile.mockReturnValueOnce(file);
  file.getLocalName.mockReturnValue("test.txt.0");

  const trzsz = new TrzszTransfer(writer);
  trzsz.addReceivedData("#NUM:1\n");
  trzsz.addReceivedData("#NAME:eJwrSS0u0SupKAEADtkDTw==\n");
  trzsz.addReceivedData("#SIZE:13\n");
  trzsz.addReceivedData("#DATA:eJwrSS0uUUjOzytJzSvhAgAkDwTm\n");
  trzsz.addReceivedData("#MD5:eJyLbvvVdeOLad0ScUXHJvHqFwBJWwf+\n");

  await expect(trzsz.recvFiles("/tmp", openSaveFile, null)).rejects.toThrowError("MD5");
});

test("download files timeout", async () => {
  const file = {
    closeFile: jest.fn(),
    getLocalName: jest.fn(),
    writeFile: jest.fn(),
    getFileName: () => "test.txt",
    isDir: () => false,
  };
  const writer = jest.fn();
  const openSaveFile = jest.fn();
  openSaveFile.mockReturnValueOnce(file);
  file.getLocalName.mockReturnValue("test.txt.0");

  const trzsz = new TrzszTransfer(writer);

  trzsz.addReceivedData("#CFG:eJyrVspJzEtXslJQKqhU0lFQSipNK86sSgUKGBqYWJiamwHFSjJzU/NLS0BitQBVlQ3Z\n");
  const config = await trzsz.recvConfig();
  expect(config.timeout).toBe(1);

  trzsz.addReceivedData("#NUM:1\n");
  trzsz.addReceivedData("#NAME:eJwrSS0u0SupKAEADtkDTw==\n");
  trzsz.addReceivedData("#SIZE:13\n");

  await expect(trzsz.recvFiles("/tmp", openSaveFile, null)).rejects.toThrowError("Receive data timeout");

  trzsz.cleanup();
  expect(file.closeFile.mock.calls.length).toBe(1);
});

test("clean input and exit", async () => {
  const writer = jest.fn();
  const trzsz = new TrzszTransfer(writer);

  trzsz.addReceivedData("input1");
  setTimeout(() => trzsz.addReceivedData("input2"), 100);

  await trzsz.clientExit("exit message");
  expect(writer.mock.calls.length).toBe(1);
  expect(writer.mock.calls[0][0]).toBe("#EXIT:eJxLrcgsUchNLS5OTE8FAB7YBMA=\n");
});

test("handle remote exit error", async () => {
  const writer = jest.fn();
  const trzsz = new TrzszTransfer(writer);

  const now = Date.now();
  trzsz.addReceivedData("input");
  const err = new TrzszError("message", "EXIT");
  await trzsz.clientError(err);

  expect(Date.now() - now).toBeGreaterThanOrEqual(100);
  expect(writer.mock.calls.length).toBe(0);
});

test("handle remote fail error with trace", async () => {
  const writer = jest.fn();
  const trzsz = new TrzszTransfer(writer);
  const logMock = jest.spyOn(console, "log").mockImplementation();

  const now = Date.now();
  trzsz.addReceivedData("input");
  const err = new TrzszError("eJxLLSrKLwIABmwCKw==", "FAIL", true);
  await trzsz.clientError(err);

  expect(Date.now() - now).toBeGreaterThanOrEqual(100);
  expect(writer.mock.calls.length).toBe(0);
  expect(logMock.mock.calls.length).toBe(1);
  expect(logMock.mock.calls[0][0]).toContain(" at ");
  expect(logMock.mock.calls[0][0]).toContain("error");
  logMock.mockRestore();
});

test("handle remote fail error without trace", async () => {
  const writer = jest.fn();
  const trzsz = new TrzszTransfer(writer);
  const logMock = jest.spyOn(console, "log").mockImplementation();

  const now = Date.now();
  trzsz.addReceivedData("input");
  const err = new TrzszError("eJxLLSrKLwIABmwCKw==", "fail", true);
  await trzsz.clientError(err);

  expect(Date.now() - now).toBeGreaterThanOrEqual(100);
  expect(writer.mock.calls.length).toBe(0);
  expect(logMock.mock.calls.length).toBe(0);
  logMock.mockRestore();
});

test("handle local error without trace", async () => {
  const writer = jest.fn();
  const trzsz = new TrzszTransfer(writer);
  const logMock = jest.spyOn(console, "log").mockImplementation();

  const now = Date.now();
  trzsz.addReceivedData("input");
  const err = new TrzszError("local error");
  await trzsz.clientError(err);

  expect(Date.now() - now).toBeGreaterThanOrEqual(100);
  expect(writer.mock.calls.length).toBe(1);
  expect(writer.mock.calls[0][0]).toBe("#fail:eJzLyU9OzFFILSrKLwIAGaMEVg==\n");
  expect(logMock.mock.calls.length).toBe(0);
  logMock.mockRestore();
});

test("handle local error with trace", async () => {
  const writer = jest.fn();
  const trzsz = new TrzszTransfer(writer);
  const logMock = jest.spyOn(console, "log").mockImplementation();

  const now = Date.now();
  trzsz.addReceivedData("input");
  const err = new TrzszError("local error", null, true);
  await trzsz.clientError(err);

  expect(Date.now() - now).toBeGreaterThanOrEqual(100);
  expect(writer.mock.calls.length).toBe(1);
  expect(writer.mock.calls[0][0]).toContain("#FAIL:");
  expect(logMock.mock.calls.length).toBe(1);
  expect(logMock.mock.calls[0][0]).toContain(" at ");
  expect(logMock.mock.calls[0][0]).toContain("local error");
  logMock.mockRestore();
});

test("send action confirm or cancel", async () => {
  const writer = jest.fn();
  const trzsz = new TrzszTransfer(writer);

  await trzsz.sendAction(true, false);
  expect(writer.mock.calls.length).toBe(1);
  expect(writer.mock.calls[0][0]).toContain("#ACT:");

  await trzsz.sendAction(false, false);
  expect(writer.mock.calls.length).toBe(2);
  expect(writer.mock.calls[1][0]).toContain("#ACT:");
});

test("receive action from remote", async () => {
  const writer = jest.fn();
  const trzsz = new TrzszTransfer(writer);

  trzsz.addReceivedData("#ACT:eJyrVspJzEtXslJQKqhU0lFQSs7PS8ssygUKlBSVpgIFylKLijPz80AqDPUM9AyUagGXFg8f\n");
  const action = await trzsz.recvAction();

  expect(action.lang).toBe("py");
  expect(action.confirm).toBe(true);
  expect(action.version).toBe("1.0.0");
});

test("send config to remote", async () => {
  const writer = jest.fn();
  const trzsz = new TrzszTransfer(writer);

  await trzsz.sendConfig({}, getEscapeChars(false), TmuxMode.NoTmux, -1);

  expect(writer.mock.calls.length).toBe(1);
  expect(writer.mock.calls[0][0]).toBe("#CFG:eJyrVspJzEtXslLKKlaqBQAeHgQ6\n");
  expect((trzsz as any).transferConfig.lang).toBe("js");

  const args = {
    quiet: true,
    binary: true,
    directory: true,
    bufsize: 100,
    timeout: 200,
    overwrite: true,
  };
  await trzsz.sendConfig(args, getEscapeChars(true), TmuxMode.TmuxNormalMode, 50);
  expect(writer.mock.calls.length).toBe(2);
  expect(writer.mock.calls[1][0]).toContain("#CFG:");
  expect((trzsz as any).transferConfig.bufsize).toBe(100);
  const cfgOut = writer.mock.calls[1][0];
  const cfgStr = await uint8ToStr(decodeBuffer(cfgOut.substring(5, cfgOut.length - 1)), "utf8");
  expect(cfgStr).toContain('["\\u00ee","\\u00ee\\u00ee"]');
  expect(cfgStr).toContain('["~","\\u00ee1"]');
  expect(cfgStr).toContain('["\\u0002","\\u00eeA"]');
  expect(cfgStr).toContain('["\\u0010","\\u00eeB"]');
  expect(cfgStr).toContain('["\\u001b","\\u00eeC"]');
  expect(cfgStr).toContain('["\\u001d","\\u00eeD"]');
  expect(cfgStr).toContain('["\\u009d","\\u00eeE"]');
  const config = JSON.parse(cfgStr);
  expect(config.quiet).toBe(true);
  expect(config.binary).toBe(true);
  expect(config.directory).toBe(true);
  expect(config.bufsize).toBe(100);
  expect(config.timeout).toBe(200);
  expect(config.overwrite).toBe(true);
  expect(config.tmux_output_junk).toBe(true);
  expect(config.tmux_pane_width).toBe(50);
});

test("receive invalid data", async () => {
  const writer = jest.fn();
  const trzsz: any = new TrzszTransfer(writer);

  trzsz.addReceivedData("data\n");
  await expect(trzsz.recvCheck("DATA")).rejects.toThrowError("colon: eJxLSSxJBAAEAAGb");

  trzsz.addReceivedData(":data\n");
  await expect(trzsz.recvCheck("DATA")).rejects.toThrowError("colon: eJyzSkksSQQABSMB1Q==");

  trzsz.addReceivedData("T:data\n");
  await expect(trzsz.recvCheck("T")).rejects.toThrowError("data");

  trzsz.addReceivedData("#T:data\n");
  await expect(trzsz.recvCheck("E")).rejects.toThrowError("data");

  trzsz.addReceivedData("#T:data\n");
  await expect(trzsz.recvCheck("T")).resolves.toBe("data");

  trzsz.addReceivedData("#SUCC:10\n");
  await expect(trzsz.checkInteger(11)).rejects.toThrowError("[10] <> [11]");

  trzsz.addReceivedData("#SUCC:eJxLBAAAYgBi\n");
  await expect(trzsz.checkString("b")).rejects.toThrowError("[a] <> [b]");

  trzsz.addReceivedData("#SUCC:eJxLBAAAYgBi\n");
  await expect(trzsz.checkBinary(strToUint8("ab"))).rejects.toThrowError("[1] <> [2]");

  trzsz.addReceivedData("#SUCC:eJxLBAAAYgBi\n");
  await expect(trzsz.checkBinary(strToUint8("b"))).rejects.toThrowError("[97] <> [98]");
});

test("stop transferring and close files", async () => {
  const writer = jest.fn();
  const trzsz = new TrzszTransfer(writer);

  const now = Date.now();
  trzsz.addReceivedData("trz\n");

  await trzsz.stopTransferring();
  await expect((trzsz as any).recvLine()).rejects.toThrowError("Stopped");

  const file = {
    closeFile: jest.fn(),
    getPathId: () => 0,
    getRelPath: () => ["test.txt"],
    isDir: () => false,
    getSize: () => 1,
    readFile: jest.fn(),
  };
  await expect(trzsz.sendFiles([file, file, file], null)).rejects.toThrowError("Stopped");

  await trzsz.clientError(new TrzszError("Stopped"));
  expect(Date.now() - now).toBeGreaterThanOrEqual(500);

  trzsz.cleanup();
  expect(file.closeFile.mock.calls.length).toBe(3);
});
