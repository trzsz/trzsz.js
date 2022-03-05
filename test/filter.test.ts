/**
 * trzsz: https://github.com/trzsz/trzsz.js
 * Copyright(c) 2022 Lonny Wong <lonnywong@qq.com>
 * @license MIT
 */

import { strToArrBuf } from "../src/comm";
import { findTrzszMagicKey, TrzszCallback, TrzszFilter } from "../src/filter";

test("find trzsz magic key from string", async () => {
  expect(await findTrzszMagicKey(null)).toBe(null);
  expect(await findTrzszMagicKey("abc")).toBe(null);
  expect(await findTrzszMagicKey("abc::")).toBe(null);
  expect(await findTrzszMagicKey("abc::TRZSZ:TRANSFER:1")).toBe("::TRZSZ:TRANSFER:1");
});

test("find trzsz magic key from array buffer", async () => {
  expect(await findTrzszMagicKey(strToArrBuf("abc"))).toBe(null);
  expect(await findTrzszMagicKey(strToArrBuf("abc::"))).toBe(null);
  expect(await findTrzszMagicKey(strToArrBuf("abc::TRZSZ:TRANSFEX"))).toBe(null);
  expect(await findTrzszMagicKey(strToArrBuf("abc::XRZSZ:TRANSFER"))).toBe(null);
  expect(await findTrzszMagicKey(strToArrBuf("abc::TRZSZ:TRANSFER"))).toBe("::TRZSZ:TRANSFER");
  expect(await findTrzszMagicKey(strToArrBuf("abc::TRZSZ:TRANSFER:1"))).toBe("::TRZSZ:TRANSFER:1");
});

test("find trzsz magic key from blob", async () => {
  expect(await findTrzszMagicKey(new Blob(["abc"]))).toBe(null);
  expect(await findTrzszMagicKey(new Blob(["abc::"]))).toBe(null);
  expect(await findTrzszMagicKey(new Blob(["abc::TRZSZ:TRANSFEX"]))).toBe(null);
  expect(await findTrzszMagicKey(new Blob(["abc::XRZSZ:TRANSFER"]))).toBe(null);
  expect(await findTrzszMagicKey(new Blob(["abc::TRZSZ:TRANSFER"]))).toBe("::TRZSZ:TRANSFER");
  expect(await findTrzszMagicKey(new Blob(["abc::TRZSZ:TRANSFER:1"]))).toBe("::TRZSZ:TRANSFER:1");
});

test("process the terminal binary input", async () => {
  const mockCallback: TrzszCallback = {
    writeToTerminal: jest.fn(),
    sendToServer: jest.fn(),
  };
  const tf = new TrzszFilter(mockCallback, 100);
  const uint8 = new Uint8Array(0x100);
  for (let i = 0; i < 0x100; i++) {
    uint8[i] = i;
  }
  tf.processBinaryInput(String.fromCharCode.apply(null, uint8));
  expect((mockCallback.sendToServer as jest.Mock).mock.calls.length).toBe(1);
  expect((mockCallback.writeToTerminal as jest.Mock).mock.calls.length).toBe(0);
  expect((mockCallback.sendToServer as jest.Mock).mock.calls[0][0]).toStrictEqual(uint8);
});
