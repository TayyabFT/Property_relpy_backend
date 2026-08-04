/**
 * One-off: seed primary + optional second admin into MongoDB.
 * Usage: node scripts/seed-admins.mjs
 */
import "../src/config/env.js";
import { connectDB, disconnectDB } from "../src/config/db.js";
import { seedAdminUser } from "../src/modules/auth/auth.service.js";

await connectDB();
await seedAdminUser();
await disconnectDB();
console.log("Admin seed complete.");
