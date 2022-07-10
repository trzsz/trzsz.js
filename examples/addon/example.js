/**
 * trzsz: https://github.com/trzsz/trzsz.js
 * Copyright(c) 2022 Lonny Wong <lonnywong@qq.com>
 * @license MIT
 */

/**
 * Initialize addon example for trzsz
 * @function
 * @param {object} terminal - the div element for xterm
 */
InitAddonExample = (terminal) => {
  fetch("/shell/create", { method: "POST" })
    .then((res) => res.json())
    .then((data) => {
      const id = data.id;
      const ws = new WebSocket(`ws://${location.host}/shell/ws/${id}`);

      const trzsz = new TrzszAddon(ws, { isWindowsShell: data.is_win });
      const fit = new FitAddon.FitAddon();

      const term = new Terminal();
      term.loadAddon(trzsz);
      term.loadAddon(fit);
      term.open(terminal);

      term.onResize((size) => {
        fetch(`/shell/resize/${id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cols: size.cols, rows: size.rows }),
        });
      });
      window.addEventListener("resize", () => fit.fit());
      fit.fit();

      term.focus();

      // enable drag files or directories to upload
      terminal.addEventListener("dragover", (event) => event.preventDefault());
      terminal.addEventListener("drop", (event) => {
        event.preventDefault();
        trzsz
          .uploadFiles(event.dataTransfer.items)
          .then(() => console.log("upload success"))
          .catch((err) => console.log(err));
      });
    });
};
