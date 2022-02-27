/**
 * trzsz: https://github.com/trzsz/trzsz.js
 * Copyright(c) 2022 Lonny Wong <lonnywong@qq.com>
 * @license MIT
 */

export {};

const fs = require("fs");
const { spawnSync } = require("child_process");

console.log(
  "The Node.js version is under development.\n" +
    "Please use the Python version instead.\n" +
    "GitHub: https://github.com/trzsz/trzsz\n"
);

const bin = "/usr/local/bin/tsz";

if (!fs.existsSync(bin)) {
  process.exit();
}
const script = fs.readFileSync(bin, "utf-8");
if (script.startsWith("#!/usr/bin/env node")) {
  process.exit();
}

// redirect to the python version
spawnSync(bin, process.argv.slice(2), { stdio: "inherit" });
