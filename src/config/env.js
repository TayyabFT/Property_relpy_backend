import dotenv from "dotenv";

dotenv.config();

export const env = {
  port: Number(process.env.PORT) || 5000,
  mongodbUri: process.env.MONGODB_URI || "",
  useMemoryDb: process.env.USE_MEMORY_DB === "true",
  jwtSecret: process.env.JWT_SECRET || "fallback-dev-secret",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  clientUrl: process.env.CLIENT_URL || "http://localhost:3000",
  nodeEnv: process.env.NODE_ENV || "development",
  adminEmail: process.env.ADMIN_EMAIL || "admin@propertyreply.co.uk",
  adminPassword: process.env.ADMIN_PASSWORD || "admin12345",
  adminFirstName: process.env.ADMIN_FIRST_NAME || "Site",
  adminLastName: process.env.ADMIN_LAST_NAME || "Admin",
  // Prefer explicit PUBLIC_API_URL; on Vercel fall back to the deployment URL
  publicApiUrl:
    process.env.PUBLIC_API_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : ""),
  resendApiKey: process.env.RESEND_API_KEY || "",
  emailFrom: process.env.EMAIL_FROM || "noreply@propertyreply.co.uk",
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || "",
  stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY || "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",
  // KYC / Stripe Identity — keep true until Identity is enabled, then set false
  stripeIdentityStaticMode: process.env.STRIPE_IDENTITY_STATIC_MODE !== "false",
  stripeIdentityWebhookSecret:
    process.env.STRIPE_IDENTITY_WEBHOOK_SECRET || "",
  cronSecret: process.env.CRON_SECRET || "",
};
