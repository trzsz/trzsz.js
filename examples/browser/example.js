/**
 * trzsz: https://github.com/trzsz/trzsz.js
 * Copyright(c) 2022 Lonny Wong <lonnywong@qq.com>
 * @license MIT
 */

/**
 * Initialize browser example for trzsz
 * @function
 * @param {object} terminal - the div element for xterm
 */
InitBrowserExample = (terminal) => {
  const term = new Terminal();
  const fit = new FitAddon.FitAddon();
  term.loadAddon(fit);
  term.open(terminal);
  fit.fit();

  const ws = new WebSocket(`ws://${location.host}/ws/shell?cols=${term.cols}&rows=${term.rows}`);

  ws.addEventListener("message", (e) => term.write(e.data));
  term.onData((data) => ws.send(JSON.stringify({ input: data })));

  term.onResize((size) => ws.send(JSON.stringify({ cols: size.cols, rows: size.rows })));
  window.addEventListener("resize", () => fit.fit());

  term.focus();
};
