/**
 * trzsz: https://github.com/trzsz/trzsz.js
 * Copyright(c) 2022 Lonny Wong <lonnywong@qq.com>
 * @license MIT
 */

const nodePty = require("node-pty");
const { app, BrowserWindow, dialog, ipcMain } = require("electron");

const createWindow = () => {
  const { screen } = require("electron");
  const display = screen.getPrimaryDisplay();
  const { width, height } = display.workAreaSize;

  const mainWindow = new BrowserWindow({
    width: width,
    height: height,
    webPreferences: {
      sandbox: false,
      contextIsolation: false,
      preload: require("path").join(__dirname, "preload.js"),
    },
  });

  mainWindow.loadFile("index.html");

  // node-pty handler
  ipcMain.on("pty:spawn", (event, ...args) => {
    const pty = nodePty.spawn(...args);
    pty.on("exit", (_code, _sig) => process.exit(_code));
    pty.on("data", (data) => mainWindow.webContents.send("pty:ondata", data));
    ipcMain.on("pty:write", (_event, data) => pty.write(Buffer.from(data)));
    ipcMain.on("pty:resize", (_event, columns, rows) => pty.resize(columns, rows));
  });

  // display native system dialog for opening and saving files.
  ipcMain.handle("show-open-dialog-sync", async (event, ...args) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    return dialog.showOpenDialogSync(win, ...args);
  });

  if (process.env.DEBUG) {
    mainWindow.openDevTools();
  }
};

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
