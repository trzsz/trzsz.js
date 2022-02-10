import typescript from "@rollup/plugin-typescript";
import commonjs from "@rollup/plugin-commonjs";
import { terser } from "rollup-plugin-terser";

export default [
  {
    input: "src/trz.ts",
    output: {
      file: "lib/trz.js",
      format: "cjs",
      sourcemap: true,
    },
    plugins: [typescript(), commonjs(), terser()],
  },
  {
    input: "src/tsz.ts",
    output: {
      file: "lib/tsz.js",
      format: "cjs",
      sourcemap: true,
    },
    plugins: [typescript(), commonjs(), terser()],
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
    plugins: [typescript(), commonjs(), terser()],
  },
];
