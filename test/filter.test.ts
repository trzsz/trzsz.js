import { TrzszCallback, TrzszFilter } from "../src/filter";

test("process the terminal binary input", () => {
  const mockCallback: TrzszCallback = {
    writeToTerminal: jest.fn(),
    sendToServer: jest.fn(),
  };
  const tf = new TrzszFilter(mockCallback, 100);
  const uint8 = new Uint8Array(0x100);
  for (let i = 0; i < 0x100; i++) {
    uint8[i] = i;
  }
  const input = String.fromCharCode.apply(null, uint8);
  tf.processBinaryInput(input);
  expect((mockCallback.sendToServer as jest.Mock).mock.calls.length).toBe(1);
  expect((mockCallback.writeToTerminal as jest.Mock).mock.calls.length).toBe(0);
  expect((mockCallback.sendToServer as jest.Mock).mock.calls[0][0]).toStrictEqual(uint8);
});
