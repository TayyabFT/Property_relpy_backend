/**
 * Root entry for Vercel Express framework detection.
 * Always delegates to the prebuilt serverless bundle (no .ts imports).
 */
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const handler = require("./api/index.js");

export default handler;
export const config = handler.config || {
  api: { bodyParser: false, externalResolver: true },
};
