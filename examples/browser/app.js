/**
 * trzsz: https://github.com/trzsz/trzsz.js
 * Copyright(c) 2022 Lonny Wong <lonnywong@qq.com>
 * @license MIT
 */

const os = require("os");
const pty = require("node-pty");
const express = require("express");
const base64js = require("base64-js");

const app = express();
require("express-ws")(app);

app.use(express.static("."));

app.ws("/ws/shell", function (ws, req) {
  console.log("create shell");

  const cmd = os.platform() === "win32" ? "powershell.exe" : "bash";
  const shell = pty.spawn(cmd, [], {
    name: "xterm-color",
    cols: Number(req.query.cols),
    rows: Number(req.query.rows),
    encoding: null,
  });

  shell.on("data", (data) => ws.send(data));

  ws.on("message", (message) => {
    data = JSON.parse(message);
    if (data.input) {
      shell.write(data.input);
    } else if (data.binary) {
      shell.write(base64js.toByteArray(data.binary));
    } else if (data.cols && data.rows) {
      console.log(`resize shell: cols=${data.cols}, rows=${data.rows}`);
      shell.resize(data.cols, data.rows);
    }
  });

  ws.on("close", () => {
    console.log("close shell");
    shell.destroy();
  });
});

const port = process.env.PORT || 8082;
app.listen(port, "127.0.0.1", function () {
  console.log(`Started at http://localhost:${port}`);
});
