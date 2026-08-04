/**
 * Compile email.ts + React Email templates to plain ESM JS
 * so Vercel can load src/ without a tsx runtime loader.
 */
import * as esbuild from "esbuild";

await esbuild.build({
  entryPoints: ["src/services/email.ts"],
  bundle: true,
  platform: "node",
  target: "node20",
  format: "esm",
  outfile: "src/services/email.js",
  jsx: "automatic",
  packages: "external",
  loader: {
    ".ts": "ts",
    ".tsx": "tsx",
    ".js": "js",
    ".json": "json",
  },
  logLevel: "info",
});

console.log("Compiled src/services/email.js");
