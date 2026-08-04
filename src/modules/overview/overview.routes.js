import { Router } from "express";
import { protect, requireActivePlan } from "../../middleware/auth.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { overviewController } from "./overview.controller.js";

const router = Router();

router.use(protect, requireActivePlan);

router.get("/", asyncHandler(overviewController.getOverview));
router.delete("/saved/:id", asyncHandler(overviewController.removeSaved));

export default router;
