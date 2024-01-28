# trzsz.js ( trz / tsz ) - 让 JS 终端支持 trzsz

[![MIT License](https://img.shields.io/badge/license-MIT-green.svg?style=flat)](https://choosealicense.com/licenses/mit/)
[![npmjs trzsz](https://img.shields.io/npm/v/trzsz.svg?style=flat)](https://www.npmjs.com/package/trzsz)
[![WebSite](https://img.shields.io/badge/WebSite-https%3A%2F%2Ftrzsz.github.io%2Fjs-blue?style=flat)](https://trzsz.github.io/js)
[![中文文档](https://img.shields.io/badge/%E4%B8%AD%E6%96%87%E6%96%87%E6%A1%A3-https%3A%2F%2Ftrzsz.github.io%2Fcn%2Fjs-blue?style=flat)](https://trzsz.github.io/cn/js)

`trzsz.js` 使 webshell 和用 electron 开发的终端支持 [trzsz](https://trzsz.github.io/cn/) ( trz / tsz —— 和 rz / sz 类似、兼容 tmux )。

_有关 `trzsz ( trz / tsz )` 更详细的文档，请查看 [https://trzsz.github.io/cn](https://trzsz.github.io/cn/)。_

## 开发指引

- 添加依赖

  ```
  npm install trzsz
  ```

  或者

  ```
  yarn add trzsz
  ```

- 在 Node.js 中引用

  ```js
  import { TrzszFilter } from "trzsz";
  ```

  或者

  ```js
  const { TrzszFilter } = require("trzsz");
  ```

- 或者在浏览器中引用

  ```html
  <script src="node_modules/trzsz/lib/trzsz.js"></script>
  ```

- 创建 `TrzszFilter` 对象（ 每个登录服务器的连接创建一个相应的 ）

  ```js
  const trzszFilter = new TrzszFilter({
    // 这里设置 trzsz 的属性，详情请参考下文。
  });
  ```

- 一般来说，服务器的输出会转发到终端进行显示，创建 `TrzszFilter` 过滤器，接受服务器的输出，并转发给终端。

  ```js
  const trzszFilter = new TrzszFilter({
    // 将服务器的输出转发给终端进行显示，当用户在服务器上执行 trz / tsz 命令时，输出则会被接管。
    writeToTerminal: (data) => terminal.write(typeof data === "string" ? data : new Uint8Array(data)),
  });

  // 将服务器的输出转发给 TrzszFilter 进行处理，一般会原样转发回上面定义的 writeToTerminal 函数。
  webSocket.addEventListener("message", (ev) => trzszFilter.processServerOutput(ev.data));
  ```

- 一般来说，用户的输入会转发到服务器上，创建 `TrzszFilter` 过滤器，接受用户的输入，并转发给服务器。

  ```js
  const trzszFilter = new TrzszFilter({
    // 将用户的输入转发到服务器上，当 trz / tsz 上传或下载时，输入则会被忽略，ctrl + c 会停止传输。
    sendToServer: (data) => webSocket.send(data),
  });

  // 将用户的输入转发给 TrzszFilter 进行处理，一般会原样转发回上面定义的 sendToServer 函数。
  terminal.onData((data) => trzszFilter.processTerminalInput(data));
  // 将用户的鼠标事件转发给 TrzszFilter 进行处理，一般会原样转发回上面定义的 sendToServer 函数。
  terminal.onBinary((data) => trzszFilter.processBinaryInput(data));
  ```

- 需要告知 `TrzszFilter` 终端的宽度，在显示进度条时会使用到。

  ```js
  const trzszFilter = new TrzszFilter({
    // 终端的初始宽度
    terminalColumns: terminal.cols,
  });

  // 当终端宽度发生变化时，告知 TrzszFilter 最新的宽度。
  terminal.onResize((size) => trzszFilter.setTerminalColumns(size.cols));
  ```

- 如果远程服务器是 Windows 命令行, 例如 `cmd` 和 `PowerShell`。

  ```js
  const trzszFilter = new TrzszFilter({
    // 声明远程服务器是 Windows 的 cmd / PowerShell 等
    isWindowsShell: true,
  });
  ```

- 如果是 `Node.js` 运行环境，即能正常执行 `require('fs')`，那么 `chooseSendFiles` and `chooseSaveDirectory` 是必须的。如果是浏览器运行环境，则会忽略它们。注意是 `async` 函数。

  ```js
  const trzszFilter = new TrzszFilter({
    // 当用户在服务器上执行 trz 命令上传文件时，require('fs') 不报错，则会回调此函数，选择要上传的文件。
    chooseSendFiles: async (directory) => {
      // 如果 `directory` 参数为 `true`，则应该允许用户选择目录和文件（ 多选 ）。
      // 如果 `directory` 参数为 `false`，则应该只允许用户选择文件（ 多选 ）。
      // 返回 `undefined` 代表用户取消选择文件，终止上传操作。
      // 正常应该回一个数组，包含文件或目录的绝对路径，如下：
      return ["/path/to/file1", "/path/to/file2", "/path/to/directory3"];
    },
    // 当用户在服务器上执行 tsz 命令下载文件时，require('fs') 不报错，则会回调此函数，选择要保存的路径。
    chooseSaveDirectory: async () => {
      // 返回 `undefined` 代表用户取消选择保存路径，终止下载操作。
      // 正常应该回一个目录的绝对路径，如下：
      return "/path/to/directory";
    },
  });
  ```

- 支持拖拽文件和目录上传的功能。

  ```js
  terminalHtmlElement.addEventListener("dragover", (event) => event.preventDefault());
  terminalHtmlElement.addEventListener("drop", (event) => {
    event.preventDefault();
    trzszFilter
      .uploadFiles(event.dataTransfer.items)
      .then(() => console.log("upload success"))
      .catch((err) => console.log(err));
  });
  ```

- 如果你在使用 [xterm-addon-attach](https://www.npmjs.com/package/xterm-addon-attach) 插件，只将简单地用 `TrzszAddon` 替换 `AttachAddon` 即可。

  ```js
  import { Terminal } from "xterm";
  import { TrzszAddon } from "trzsz";

  const terminal = new Terminal();
  const trzszAddon = new TrzszAddon(webSocket);
  terminal.loadAddon(trzszAddon);
  ```

## 开发示例

- [浏览器](https://github.com/trzsz/trzsz.js/blob/main/examples/browser) webshell 例子。

- [Electron](https://github.com/trzsz/trzsz.js/blob/main/examples/electron) 终端例子。

- [TrzszAddon](https://github.com/trzsz/trzsz.js/blob/main/examples/addon) xterm 插件例子。

## 录屏演示

#### 在浏览器 webshell 中上传和下载文件

![browser example](https://trzsz.github.io/images/browser.gif)

#### 在 electron 应用中上传和下载文件

![electron example](https://trzsz.github.io/images/electron.gif)

## 联系方式

有什么问题可以发邮件给作者 <lonnywong@qq.com>，也可以提 [Issues](https://github.com/trzsz/trzsz.js/issues) 。欢迎加入 QQ 群：318578930。

## 赞助打赏

[❤️ 赞助 trzsz ❤️](https://github.com/trzsz)，请作者喝杯咖啡 ☕ ? 谢谢您们的支持！
