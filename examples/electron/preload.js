window.platform = require("os").platform();

const { TrzszFilter } = require("trzsz");
const { ipcRenderer } = require("electron");

// preload to give fs permission to trzsz, for better user experience.
window.newTrzsz = function (writeToTerminal, sendToServer, terminalColumns, isWindowsShell) {
  // create a trzsz filter
  return new TrzszFilter({
    // write the server output to the terminal
    writeToTerminal: writeToTerminal,
    // send the user input to the server
    sendToServer: sendToServer,
    // choose some files to be sent to the server
    chooseSendFiles: async (directory) => {
      const properties = [
        "openFile",
        "multiSelections",
        "showHiddenFiles",
        "noResolveAliases",
        "treatPackageAsDirectory",
        "dontAddToRecent",
      ];
      if (directory) {
        properties.push("openDirectory");
      }
      return ipcRenderer.invoke("show-open-dialog-sync", {
        title: "Choose some files to send",
        message: "Choose some files to send",
        properties: properties,
      });
    },
    // choose a directory to save the received files
    chooseSaveDirectory: async () => {
      const savePaths = await ipcRenderer.invoke("show-open-dialog-sync", {
        title: "Choose a folder to save file(s)",
        message: "Choose a folder to save file(s)",
        properties: [
          "openDirectory",
          "showHiddenFiles",
          "createDirectory",
          "noResolveAliases",
          "treatPackageAsDirectory",
          "dontAddToRecent",
        ],
      });
      if (!savePaths || !savePaths.length) {
        return undefined;
      }
      return savePaths[0];
    },
    // the terminal columns
    terminalColumns: terminalColumns,
    // there is a windows shell
    isWindowsShell: isWindowsShell,
  });
};

// node-pty proxy
class PtyProxy {
  constructor(...args) {
    ipcRenderer.send("pty:spawn", ...args);
  }

  on(evt, handler) {
    ipcRenderer.on(`pty:on${evt}`, (_event, ...args) => handler(...args));
  }

  write(data) {
    ipcRenderer.send("pty:write", data);
  }

  resize(cols, rows) {
    ipcRenderer.send("pty:resize", cols, rows);
  }
}
window.spawnPTY = function (...args) {
  return new PtyProxy(...args);
};
