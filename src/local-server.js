import { createApp } from "./app.js";
import { connectDB } from "./config/db.js";
import { env } from "./config/env.js";
import { seedAdminUser } from "./modules/auth/auth.service.js";
import { startMembershipRenewalJob } from "./jobs/emailJobs.js";
import { migrateLegacyKycStatuses } from "./migrations/migrateKycStatus.js";
import { billingService } from "./modules/billing/billing.service.js";

/**
 * Local-only Node server (app.listen).
 * Vercel must NOT auto-detect this file — production uses api/index.js.
 */
async function startLocal() {
  await connectDB();
  await migrateLegacyKycStatuses();
  await seedAdminUser();
  await billingService.initStripePrices();
  startMembershipRenewalJob();

  const app = createApp();
  app.listen(env.port, () => {
    console.log(`Server running on http://localhost:${env.port}`);
    console.log(`API base: http://localhost:${env.port}/api`);
  });
}

startLocal().catch((error) => {
  console.error("Failed to start server:", error.message);
  process.exit(1);
});
