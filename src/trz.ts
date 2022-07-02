/**
 * trzsz: https://github.com/trzsz/trzsz.js
 * Copyright(c) 2022 Lonny Wong <lonnywong@qq.com>
 * @license MIT
 */

export {};

import { trzszVersion } from "./comm";
import { BufferSizeParser } from "./args";
import { ArgumentParser, RawTextHelpFormatter } from "argparse";

/**
 * trz main entry
 */
function main() {
  const parser = new ArgumentParser({
    description: "Receive file(s), similar to rz and compatible with tmux.",
    formatter_class: RawTextHelpFormatter,
  });
  parser.add_argument("-v", "--version", { action: "version", version: `%(prog)s (trzsz) js ${trzszVersion}` });
  parser.add_argument("-q", "--quiet", { action: "store_true", help: "quiet (hide progress bar)" });
  parser.add_argument("-y", "--overwrite", { action: "store_true", help: "yes, overwrite existing file(s)" });
  parser.add_argument("-b", "--binary", {
    action: "store_true",
    help: "binary transfer mode, faster for binary files",
  });
  parser.add_argument("-e", "--escape", { action: "store_true", help: "escape all known control characters" });
  parser.add_argument("-d", "--directory", { action: "store_true", help: "transfer directories and files" });
  parser.add_argument("-B", "--bufsize", {
    min_size: "1K",
    max_size: "1G",
    default: "10M",
    action: BufferSizeParser,
    metavar: "N",
    help: "max buffer chunk size (1K<=N<=1G). (default: 10M)",
  });
  parser.add_argument("-t", "--timeout", {
    type: "int",
    default: 10,
    metavar: "N",
    help: "timeout ( N seconds ) for each buffer chunk.\nN <= 0 means never timeout. (default: 10)",
  });
  parser.add_argument("path", { nargs: "?", default: ".", help: "path to save file(s). (default: current directory)" });

  const args = parser.parse_args();

  console.dir(args);
}

main();

// redirect to the python version
console.log(
  "\nThe Node.js version is under development.\n" +
    "Please use the Python version instead.\n" +
    "GitHub: https://github.com/trzsz/trzsz\n"
);

const bin = "/usr/local/bin/trz";
const fs = require("fs");
if (!fs.existsSync(bin)) {
  process.exit();
}
const script = fs.readFileSync(bin, "utf-8");
if (script.startsWith("#!/usr/bin/env node")) {
  process.exit();
}

const { spawnSync } = require("child_process");
spawnSync(bin, process.argv.slice(2), { stdio: "inherit" });
