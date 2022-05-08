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
 * tsz main entry
 */
function main() {
  const parser = new ArgumentParser({
    description: "Send file(s), similar to sz and compatible with tmux.",
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
    default: 100,
    metavar: "N",
    help: "timeout ( N seconds ) for each buffer chunk.\nN <= 0 means never timeout. (default: 100)",
  });
  parser.add_argument("file", { nargs: "+", help: "file(s) to be sent" });

  const args = parser.parse_args();

  console.dir(args);
}

main();
