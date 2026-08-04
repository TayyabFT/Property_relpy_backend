import { createApp } from "./app.js";
import { connectDB } from "./config/db.js";
import { seedAdminUser } from "./modules/auth/auth.service.js";
import { migrateLegacyKycStatuses } from "./migrations/migrateKycStatus.js";
import { billingService } from "./modules/billing/billing.service.js";

let bootPromise = null;

async function bootstrap() {
  await connectDB();
  await migrateLegacyKycStatuses();
  await seedAdminUser();

  // Don't take down the whole API if Stripe price sync fails
  try {
    await billingService.initStripePrices();
  } catch (err) {
    console.error("[boot] initStripePrices failed:", err?.message || err);
  }

  return createApp();
}

/** Ensure DB + app are ready once per warm serverless instance */
export async function getApp() {
  if (!bootPromise) {
    bootPromise = bootstrap().catch((err) => {
      bootPromise = null;
      throw err;
    });
  }
  return bootPromise;
}

/**
 * Vercel serverless entry — Express as (req, res) handler.
 */
async function handler(req, res) {
  try {
    const expressApp = await getApp();
    return expressApp(req, res);
  } catch (err) {
    console.error("[vercel-handler]", err);
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

// Required so Stripe webhook signature verification receives the raw body.
handler.config = {
  api: {
    bodyParser: false,
    externalResolver: true,
  },
};

export default handler;
export const config = handler.config;
