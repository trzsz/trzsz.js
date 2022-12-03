/**
 * trzsz: https://github.com/trzsz/trzsz.js
 * Copyright(c) 2022 Lonny Wong <lonnywong@qq.com>
 * @license MIT
 */

export {};

import { BufferSizeParser } from "./args";
import { TrzszTransfer } from "./transfer";
import { checkPathsReadable } from "./nodefs";
import { ArgumentParser, RawTextHelpFormatter } from "argparse";
import {
  trzszVersion,
  checkDuplicateNames,
  isRunningInWindows,
  checkTmux,
  getTerminalColumns,
  setStdinRaw,
  resetStdinTty,
  setupConsoleOutput,
  TmuxMode,
  TrzszError,
  TrzszFileReader,
} from "./comm";

/* eslint-disable require-jsdoc */

function parseArgs() {
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
    default: 20,
    metavar: "N",
    help: "timeout ( N seconds ) for each buffer chunk.\nN <= 0 means never timeout. (default: 20)",
  });
  parser.add_argument("file", { nargs: "+", help: "file(s) to be sent" });
  return parser.parse_args();
}

async function sendFiles(
  transfer: TrzszTransfer,
  fileList: TrzszFileReader[],
  args: any,
  tmuxMode: number,
  tmuxPaneWidth: number
) {
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

    await transfer.sendConfig(args, [], tmuxMode, tmuxPaneWidth);

    await transfer.sendFiles(fileList, null);

    const msg = await transfer.recvExit();
    await transfer.serverExit(msg);
  } catch (err) {
    await transfer.serverError(err);
  } finally {
    transfer.cleanup();
  }
}

/**
 * tsz main entry
 */
async function main() {
  const args = parseArgs();

  try {
    const fileList = checkPathsReadable(args.file, args.directory);
    if (!fileList) {
      return;
    }
    if (args.overwrite) {
      checkDuplicateNames(fileList);
    }

    const [tmuxMode, realStdoutWriter, tmuxPaneWidth] = await checkTmux();

    if (args.binary && tmuxMode === TmuxMode.TmuxControlMode) {
      process.stdout.write("Binary download in tmux control mode is slower, auto switch to base64 mode.\n");
      args.binary = false;
    }
    if (args.binary && isRunningInWindows) {
      process.stdout.write("Binary download on Windows is not supported, auto switch to base64 mode.\n");
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

    process.stdout.write(`\x1b7\x07::TRZSZ:TRANSFER:S:${trzszVersion}:${uniqueId}\r\n`);

    const transfer = new TrzszTransfer(realStdoutWriter as any, isRunningInWindows);

    await setStdinRaw();
    process.stdin.on("data", (data) => {
      transfer.addReceivedData(data);
    });

    process.on("SIGINT", () => transfer.stopTransferring());
    process.on("SIGTERM", () => transfer.stopTransferring());
    process.on("SIGBREAK", () => transfer.stopTransferring());

    await sendFiles(transfer, fileList, args, tmuxMode as number, tmuxPaneWidth as number);
  } catch (err) {
    console.log(TrzszError.getErrorMessage(err));
  } finally {
    await resetStdinTty();
  }
}

main().finally(() => process.exit(0));
