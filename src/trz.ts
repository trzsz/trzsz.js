/**
 * trzsz: https://github.com/trzsz/trzsz.js
 * Copyright(c) 2023 Lonny Wong <lonnywong@qq.com>
 * @license MIT
 */

export { };

const path = require("path");
import * as nodefs from "./nodefs";
import { BufferSizeParser } from "./args";
import { getEscapeChars } from "./escape";
import { TrzszTransfer } from "./transfer";
import { ArgumentParser, RawTextHelpFormatter } from "argparse";
import {
  trzszVersion,
  isRunningInWindows,
  checkTmux,
  getTerminalColumns,
  setStdinRaw,
  resetStdinTty,
  setupConsoleOutput,
  TmuxMode,
  TrzszError,
  formatSavedFiles,
} from "./comm";

/* eslint-disable require-jsdoc */

function parseArgs() {
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
  parser.add_argument("-r", "--recursive", {
    action: "store_true",
    help: "transfer directories and files, same as -d",
  });
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
    default: 20,
    metavar: "N",
    help: "timeout ( N seconds ) for each buffer chunk.\nN <= 0 means never timeout. (default: 20)",
  });
  parser.add_argument("path", { nargs: "?", default: ".", help: "path to save file(s). (default: current directory)" });
  const args = parser.parse_args();
  if (args.recursive === true) {
    args.directory = true;
  }
  return args;
}

async function recvFiles(transfer: TrzszTransfer, args: any, tmuxMode: number, tmuxPaneWidth: number) {
  try {
    const action = await transfer.recvAction();

    if (action.confirm !== true) {
      await transfer.serverExit("Cancelled");
      return;
    }

    // check if the client doesn't support binary mode
    if (action.binary === false && args.binary) {
      args.binary = false;
    }
    // check if the client doesn't support transfer directory
    if (args.directory && action.support_dir !== true) {
      throw new TrzszError("The client doesn't support transfer directory");
    }

    const escapeChars = getEscapeChars(args.escape);
    await transfer.sendConfig(args, escapeChars, tmuxMode, tmuxPaneWidth);

    const saveParam = { path: args.path, maps: new Map<string, string>() };
    const localNames = await transfer.recvFiles(saveParam, nodefs.openSaveFile, null);

    await transfer.recvExit();
    await transfer.serverExit(formatSavedFiles(localNames, args.path));
  } catch (err) {
    await transfer.serverError(err);
  } finally {
    transfer.cleanup();
  }
}

/**
 * trz main entry
 */
async function main() {
  const args = parseArgs();

  try {
    args.path = path.resolve(args.path);
    nodefs.checkPathWritable(args.path);

    const [tmuxMode, realStdoutWriter, tmuxPaneWidth] = await checkTmux();

    if (args.binary && tmuxMode !== TmuxMode.NoTmux) {
      process.stdout.write("Binary upload in tmux is not supported, auto switch to base64 mode.\n");
      args.binary = false;
    }
    if (args.binary && isRunningInWindows) {
      process.stdout.write("Binary upload on Windows is not supported, auto switch to base64 mode.\n");
      args.binary = false;
    }

    let uniqueId = (Date.now() % 10e10).toString();
    if (isRunningInWindows) {
      setupConsoleOutput();
      uniqueId += "10";
    } else if (tmuxMode === TmuxMode.TmuxNormalMode) {
      const columns = getTerminalColumns();
      if (columns > 0 && columns < 40) {
        process.stdout.write("\n\n\x1b[2A\x1b[0J");
      } else {
        process.stdout.write("\n\x1b[1A\x1b[0J");
      }
      uniqueId += "20";
    } else {
      uniqueId += "00";
    }

    const mode = args.directory ? "D" : "R";
    process.stdout.write(`\x1b7\x07::TRZSZ:TRANSFER:${mode}:${trzszVersion}:${uniqueId.padStart(13, "0")}\r\n`);

    const transfer = new TrzszTransfer(realStdoutWriter as any, isRunningInWindows);

    await setStdinRaw();
    process.stdin.on("data", (data) => {
      transfer.addReceivedData(data);
    });

    process.on("SIGINT", () => transfer.stopTransferring());
    process.on("SIGTERM", () => transfer.stopTransferring());
    process.on("SIGBREAK", () => transfer.stopTransferring());

    await recvFiles(transfer, args, tmuxMode as number, tmuxPaneWidth as number);
  } catch (err) {
    console.log(TrzszError.getErrorMessage(err));
  } finally {
    await resetStdinTty();
  }
}

main().finally(() => process.exit(0));
