import express from "express";
import cors from "cors";
import apiRoutes from "./routes/index.js";
import { errorHandler, notFound } from "./middleware/error.middleware.js";
import { asyncHandler } from "./utils/asyncHandler.js";
import { kycController } from "./modules/kyc/kyc.controller.js";
import { billingController } from "./modules/billing/billing.controller.js";

export function createApp() {
  const app = express();

  // Allow requests from any origin (Vercel, localhost, etc.)
  app.use(
    cors({
      origin: true,
      credentials: true,
    }),
  );

  // Stripe Identity webhook requires raw body for signature verification
  app.post(
    "/api/kyc/webhook",
    express.raw({ type: "application/json" }),
    asyncHandler(kycController.handleWebhook),
  );

  // Stripe webhook requires raw body for signature verification
  app.post(
    "/api/billing/webhook",
    express.raw({ type: "application/json" }),
    asyncHandler(billingController.webhook),
  );

  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));

  app.use("/api", apiRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
