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

  // initialize trzsz filter
  const trzsz = new TrzszFilter(
    {
      // write the server output to the terminal
      writeToTerminal: (output) => term.write(output),
      // send the user input to the server
      sendToServer: (data) => ws.send(JSON.stringify({ input: data })),
    },
    // the terminal columns
    term.cols
  );

  // let trzsz process the server output
  ws.addEventListener("message", (e) => trzsz.processServerOutput(e.data));
  // let trzsz process the user input
  term.onData((data) => trzsz.processTerminalInput(data));
  term.onBinary((data) => trzsz.processBinaryInput(data));

  term.onResize((size) => {
    ws.send(JSON.stringify({ cols: size.cols, rows: size.rows }));
    // tell trzsz the terminal columns has been changed
    trzsz.setTerminalColumns(size.cols);
  });
  window.addEventListener("resize", () => fit.fit());

  term.focus();
};
