import typescript from "@rollup/plugin-typescript";
import commonjs from "@rollup/plugin-commonjs";
import terser from '@rollup/plugin-terser';
import dts from "rollup-plugin-dts";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import versionInjector from "rollup-plugin-version-injector";

const version = versionInjector({
  injectInComments: false,
  injectInTags: {
    fileRegexp: /\.(js|mjs)$/,
    tagId: "VersionInject",
  },
});

export default [
  {
    input: "src/trz.ts",
    output: {
      file: "lib/trz.js",
      format: "cjs",
      sourcemap: true,
    },
    plugins: [version, typescript(), nodeResolve(), commonjs()],
  },
  {
    input: "src/tsz.ts",
    output: {
      file: "lib/tsz.js",
      format: "cjs",
      sourcemap: true,
    },
    plugins: [version, typescript(), nodeResolve(), commonjs()],
  },
  {
    input: "src/trzsz.ts",
    output: [
      {
        file: "lib/trzsz.js",
        format: "umd",
        name: "window",
        extend: true,
        sourcemap: true,
      },
      {
        file: "lib/trzsz.mjs",
        format: "es",
        sourcemap: true,
      },
    ],
    plugins: [version, typescript(), nodeResolve(), commonjs(), terser({ format: { comments: false } })],
  },
  {
    input: "dist/dts/trzsz.d.ts",
    output: [{ file: "lib/trzsz.d.ts", format: "es" }],
    plugins: [dts()],
  },
];
