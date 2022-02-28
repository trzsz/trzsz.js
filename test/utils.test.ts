import * as utils from "../src/utils";

/* eslint-disable require-jsdoc */

test("find trzsz magic key from string", async () => {
  expect(await utils.findTrzszMagicKey(null)).toBe(null);
  expect(await utils.findTrzszMagicKey("abc")).toBe(null);
  expect(await utils.findTrzszMagicKey("abc::")).toBe(null);
  expect(await utils.findTrzszMagicKey("abc::TRZSZ:TRANSFER:1")).toBe("::TRZSZ:TRANSFER:1");
});

test("find trzsz magic key from array buffer", async () => {
  async function testFindTrzszMagicKey(buf: string) {
    return await utils.findTrzszMagicKey(Uint8Array.from(buf, (v) => v.charCodeAt(0)).buffer);
  }
  expect(await testFindTrzszMagicKey("abc")).toBe(null);
  expect(await testFindTrzszMagicKey("abc::")).toBe(null);
  expect(await testFindTrzszMagicKey("abc::TRZSZ:TRANSFEX")).toBe(null);
  expect(await testFindTrzszMagicKey("abc::XRZSZ:TRANSFER")).toBe(null);
  expect(await testFindTrzszMagicKey("abc::TRZSZ:TRANSFER")).toBe("::TRZSZ:TRANSFER");
  expect(await testFindTrzszMagicKey("abc::TRZSZ:TRANSFER:1")).toBe("::TRZSZ:TRANSFER:1");
});

test("find trzsz magic key from blob", async () => {
  async function testFindTrzszMagicKey(buf: string) {
    return await utils.findTrzszMagicKey(new Blob([buf], { type: "text/plain" }));
  }
  expect(await testFindTrzszMagicKey("abc")).toBe(null);
  expect(await testFindTrzszMagicKey("abc::")).toBe(null);
  expect(await testFindTrzszMagicKey("abc::TRZSZ:TRANSFEX")).toBe(null);
  expect(await testFindTrzszMagicKey("abc::XRZSZ:TRANSFER")).toBe(null);
  expect(await testFindTrzszMagicKey("abc::TRZSZ:TRANSFER")).toBe("::TRZSZ:TRANSFER");
  expect(await testFindTrzszMagicKey("abc::TRZSZ:TRANSFER:1")).toBe("::TRZSZ:TRANSFER:1");
});

test("zlib and base64 encode buffer", () => {
  expect(utils.encodeBuffer("abc")).toBe("eJxLTEoGAAJNASc=");
  expect(utils.encodeBuffer("ABCDE")).toBe("eJxzdHJ2cQUAA+gBUA==");
  expect(utils.encodeBuffer(Uint8Array.from("", (v) => v.charCodeAt(0)))).toBe("eJwDAAAAAAE=");
  expect(utils.encodeBuffer(Uint8Array.from("1", (v) => v.charCodeAt(0)))).toBe("eJwzBAAAMgAy");
});

test("base64 and zlib decode buffer", () => {
  expect(utils.decodeBuffer("eJxLTEoGAAJNASc=")).toStrictEqual(Uint8Array.from("abc", (v) => v.charCodeAt(0)));
  expect(utils.decodeBuffer("eJxzdHJ2cQUAA+gBUA==")).toStrictEqual(Uint8Array.from("ABCDE", (v) => v.charCodeAt(0)));
  expect(utils.decodeBuffer("eJwDAAAAAAE=")).toStrictEqual(Uint8Array.from("", (v) => v.charCodeAt(0)));
  expect(utils.decodeBuffer("eJwzBAAAMgAy")).toStrictEqual(Uint8Array.from("1", (v) => v.charCodeAt(0)));
});
