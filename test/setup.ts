/**
 * trzsz: https://github.com/trzsz/trzsz.js
 * Copyright(c) 2022 Lonny Wong <lonnywong@qq.com>
 * @license MIT
 */

global.Blob = class MockBlob extends Blob {
  /**
   * https://github.com/jsdom/jsdom/issues/2555
   * @return {ArrayBuffer}
   */
  public async arrayBuffer() {
    return new Promise<ArrayBuffer>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as ArrayBuffer);
      reader.readAsArrayBuffer(this);
    });
  }
};
