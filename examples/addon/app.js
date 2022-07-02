/**
 * trzsz: https://github.com/trzsz/trzsz.js
 * Copyright(c) 2022 Lonny Wong <lonnywong@qq.com>
 * @license MIT
 */

const os = require("os");
const pty = require("node-pty");
const express = require("express");

const app = express();
require("express-ws")(app);

app.use(express.json());
app.use(express.static("."));

let shellID = 0;
const shellArr = [];

app.post("/shell/create", (req, res) => {
  const id = ++shellID;
  console.log(`create shell: id=${id}`);

  const cmd = os.platform() === "win32" ? "powershell.exe" : "bash";
  shellArr[id] = pty.spawn(cmd, [], { name: "xterm-color", encoding: null });

  res.json({ id: id, is_win: os.platform() === "win32" });
});

app.post("/shell/resize/:id", (req, res) => {
  const id = Number(req.params.id);
  const { cols, rows } = req.body;
  console.log(`resize shell: id=${id}, cols=${cols}, rows=${rows}`);

  const shell = shellArr[id];
  shell.resize(cols, rows);

  res.json({ id: id, cols: cols, rows: rows });
});

app.ws("/shell/ws/:id", function (ws, req) {
  const id = Number(req.params.id);
  const shell = shellArr[id];

  shell.on("data", (data) => ws.send(data));

  ws.on("message", (message) => shell.write(message));

  ws.on("close", () => {
    console.log(`close shell: id=${id}`);
    shell.destroy();
  });
});

const port = process.env.PORT || 8081;
app.listen(port, "127.0.0.1", function () {
  console.log(`Started at http://localhost:${port}`);
});
