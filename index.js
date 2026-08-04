/**
 * Root entry used when Vercel detects an Express app.
 * Uses source modules + compiled email.js (no .ts imports).
 */
import { getApp } from "./src/vercel-handler.js";

export default async function handler(req, res) {
  try {
    const app = await getApp();
    return app(req, res);
  } catch (err) {
    console.error("[root-entry]", err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          success: false,
          message: "Server failed to start",
          error: err?.message || String(err),
        }),
      );
    }
  }
}

export const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
  },
};
