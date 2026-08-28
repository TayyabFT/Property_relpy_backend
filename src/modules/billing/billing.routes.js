import { Router } from "express";
import { protect } from "../../middleware/auth.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { billingController } from "./billing.controller.js";

const router = Router();

router.use(protect);

router.post("/checkout", asyncHandler(billingController.checkout));
router.get("/confirm", asyncHandler(billingController.confirmCheckout));
router.post("/portal", asyncHandler(billingController.portal));
router.post("/start-trial", asyncHandler(billingController.startTrial));
router.post("/commercial-checkout", asyncHandler(billingController.commercialCheckout));

export default router;
