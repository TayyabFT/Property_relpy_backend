import { Router } from "express";
import { protect, requireActivePlan } from "../../middleware/auth.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { dealAnalysisController } from "./dealAnalysis.controller.js";

const router = Router();

router.use(protect, requireActivePlan);

router.get("/report-reasons", asyncHandler(dealAnalysisController.getReportReasons));
router.get("/deals", asyncHandler(dealAnalysisController.getDeals));
router.get("/:listingId/contact", asyncHandler(dealAnalysisController.getContact));
router.post("/:listingId/enquiry", asyncHandler(dealAnalysisController.sendEnquiry));
router.get("/:listingId", asyncHandler(dealAnalysisController.getAnalysis));
router.post("/:listingId/save", asyncHandler(dealAnalysisController.saveDeal));
router.delete("/:listingId/save", asyncHandler(dealAnalysisController.unsaveDeal));
router.post("/:listingId/report", asyncHandler(dealAnalysisController.reportDeal));

export default router;
