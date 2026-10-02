/**
 * Fully bundle the API for Vercel (including deps) so serverless does not
 * depend on a runtime tsx loader or fragile module tracing.
 */
import * as esbuild from "esbuild";
import { mkdirSync, writeFileSync, readFileSync, unlinkSync } from "node:fs";
import { spawnSync } from "node:child_process";

const emailBuild = spawnSync(process.execPath, ["scripts/build-email.mjs"], {
  stdio: "inherit",
});
if (emailBuild.status !== 0) {
  process.exit(emailBuild.status ?? 1);
}

mkdirSync("api", { recursive: true });

const tmpOut = "api/.bundle.tmp.cjs";

await esbuild.build({
  entryPoints: ["src/vercel-handler.js"],
  bundle: true,
  platform: "node",
  target: "node24",
  format: "cjs",
  outfile: tmpOut,
  loader: {
    ".js": "js",
    ".ts": "ts",
    ".tsx": "tsx",
    ".json": "json",
  },
  jsx: "automatic",
  // Dev-only / optional native bits — never used on Vercel
  external: [
    "mongodb-memory-server",
    "kerberos",
    "@mongodb-js/zstd",
    "snappy",
    "aws4",
    "mongodb-client-encryption",
  ],
  logLevel: "info",
});

const bundle = readFileSync(tmpOut, "utf8");
unlinkSync(tmpOut);

// Force CommonJS handler shape Vercel expects
writeFileSync(
  "api/index.js",
  `${bundle}

// --- Vercel export shim ---
const __exported = module.exports.default || module.exports;
module.exports = __exported;
module.exports.config = __exported.config || {
  api: { bodyParser: false, externalResolver: true },
};
`,
);

// This folder must be CommonJS so api/index.js is not treated as ESM
writeFileSync(
  "api/package.json",
  JSON.stringify({ type: "commonjs" }, null, 2) + "\n",
);

console.log(`Vercel API bundle ready (${bundle.length} bytes)`);
