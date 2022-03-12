/**
 * trzsz: https://github.com/trzsz/trzsz.js
 * Copyright(c) 2022 Lonny Wong <lonnywong@qq.com>
 * @license MIT
 */

/**
 * Initialize electron example for trzsz
 * @function
 * @param {object} terminal - the div element for xterm
 */
InitElectronExapmle = (terminal) => {
  const term = new Terminal();
  const fit = new FitAddon.FitAddon();
  term.loadAddon(fit);
  term.open(terminal);
  fit.fit();

  const cmd = window.platform === "win32" ? "powershell.exe" : "bash";
  const pty = window.pty.spawn(cmd, [], {
    name: "xterm-color",
    cols: term.cols,
    rows: term.rows,
    encoding: null,
  });

  const trzsz = window.newTrzsz(
    // write the server output to the terminal
    (output) => term.write(output),
    // send the user input to the server
    (input) => pty.write(input),
    // the terminal columns
    term.cols
  );

  // let trzsz process the server output
  pty.on("data", (data) => trzsz.processServerOutput(data));
  // let trzsz process the user input
  term.onData((data) => trzsz.processTerminalInput(data));
  term.onBinary((data) => trzsz.processBinaryInput(data));

  term.onResize((size) => {
    pty.resize(size.cols, size.rows);
    // tell trzsz the terminal columns has been changed
    trzsz.setTerminalColumns(term.cols);
  });
  window.addEventListener("resize", () => fit.fit());

  term.focus();
};
