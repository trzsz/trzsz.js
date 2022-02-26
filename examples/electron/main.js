/**
 * trzsz: https://github.com/trzsz/trzsz.js
 * Copyright(c) 2022 Lonny Wong <lonnywong@qq.com>
 * @license MIT
 */

const { app, BrowserWindow, dialog, ipcMain } = require("electron");

const createWindow = () => {
  const { screen } = require("electron");
  const display = screen.getPrimaryDisplay();
  const { width, height } = display.workAreaSize;

  const mainWindow = new BrowserWindow({
    width: width,
    height: height,
    webPreferences: {
      contextIsolation: false,
      preload: require("path").join(__dirname, "preload.js"),
    },
  });

  // display native system dialog for opening and saving files.
  ipcMain.handle("show-open-dialog-sync", async (event, ...args) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    return dialog.showOpenDialogSync(win, ...args);
  });

  mainWindow.loadFile("index.html");

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

app.allowRendererProcessReuse = false;
