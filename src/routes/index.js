import { Router } from "express";
import authRoutes from "../modules/auth/auth.routes.js";
import overviewRoutes from "../modules/overview/overview.routes.js";
import listingsRoutes from "../modules/listings/listings.routes.js";
import dealAnalysisRoutes from "../modules/dealAnalysis/dealAnalysis.routes.js";
import submitRoutes from "../modules/submit/submit.routes.js";
import adminRoutes from "../modules/admin/admin.routes.js";
import billingRoutes from "../modules/billing/billing.routes.js";
import notificationRoutes from "../modules/notifications/notification.routes.js";
import kycRoutes from "../modules/kyc/kyc.routes.js";
import enquiriesRoutes from "../modules/enquiries/enquiries.routes.js";
import cronRoutes from "../modules/cron/cron.routes.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { listingsController } from "../modules/listings/listings.controller.js";
import partnerInviteRoutes from "../modules/invitedPartners/partnerInvite.routes.js";
import affiliateRoutes from "../modules/affiliates/affiliate.routes.js";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ success: true, message: "PropertyReply API is running" });
});

router.get(
  "/public/listings",
  asyncHandler(listingsController.getPublicListings),
);

router.use("/auth", authRoutes);
router.use("/partner-invites", partnerInviteRoutes);
router.use("/affiliates", affiliateRoutes);
router.use("/overview", overviewRoutes);
router.use("/listings", listingsRoutes);
router.use("/deal-analysis", dealAnalysisRoutes);
router.use("/submit", submitRoutes);
router.use("/admin", adminRoutes);
router.use("/billing", billingRoutes);
router.use("/notifications", notificationRoutes);
router.use("/kyc", kycRoutes);
router.use("/enquiries", enquiriesRoutes);
router.use("/cron", cronRoutes);

export default router;
