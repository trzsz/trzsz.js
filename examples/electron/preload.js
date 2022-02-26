window.pty = require("node-pty");
window.platform = require("os").platform();

const { TrzszFilter } = require("trzsz");
const { ipcRenderer } = require("electron");

// preload to give fs permission to trzsz, for better user experience.
window.newTrzsz = function (writeToTerminal, sendToServer, terminalColumns) {
  // create a trzsz filter
  return new TrzszFilter(
    {
      // write the server output to the terminal
      writeToTerminal: writeToTerminal,
      // send the user input to the server
      sendToServer: sendToServer,
      // choose some files to be sent to the server
      chooseSendFiles: async () => {
        return ipcRenderer.invoke("show-open-dialog-sync", {
          title: "Choose some files to send",
          message: "Choose some files to send",
          properties: [
            "openFile",
            "multiSelections",
            "showHiddenFiles",
            "noResolveAliases",
            "treatPackageAsDirectory",
            "dontAddToRecent",
          ],
        });
      },
      // choose a directory to save the received files
      chooseSaveDirectory: async () => {
        return ipcRenderer.invoke("show-open-dialog-sync", {
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
      },
    },
    // the terminal columns
    terminalColumns
  );
};
