import { createApp } from "./app.js";
import { connectDB } from "./config/db.js";
import { seedAdminUser } from "./modules/auth/auth.service.js";
import { migrateLegacyKycStatuses } from "./migrations/migrateKycStatus.js";
import { billingService } from "./modules/billing/billing.service.js";

let bootPromise = null;
let app = null;

async function bootstrap() {
  await connectDB();
  await migrateLegacyKycStatuses();
  await seedAdminUser();
  await billingService.initStripePrices();
  app = createApp();
  return app;
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
 * Stripe raw-body routes continue to work when bodyParser is disabled.
 */
export default async function handler(req, res) {
  const expressApp = await getApp();
  return expressApp(req, res);
}
