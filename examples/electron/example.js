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
  });

  pty.on("data", (data) => term.write(data));
  term.onData((data) => pty.write(data));

  term.onResize((size) => pty.resize(size.cols, size.rows));
  window.addEventListener("resize", () => fit.fit());

  term.focus();
};
