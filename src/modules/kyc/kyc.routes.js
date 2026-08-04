import { Router } from "express";
import { protect } from "../../middleware/auth.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { kycController } from "./kyc.controller.js";

const router = Router();

router.use(protect);

router.get("/", asyncHandler(kycController.getStatus));
router.post("/start-verification", asyncHandler(kycController.startVerification));

export default router;
