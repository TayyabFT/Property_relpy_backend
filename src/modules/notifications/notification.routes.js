import { Router } from "express";
import { protect, requireActivePlan } from "../../middleware/auth.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { notificationController } from "./notification.controller.js";

const router = Router();

router.use(protect, requireActivePlan);

router.get("/", asyncHandler(notificationController.list));
router.post("/read-all", asyncHandler(notificationController.markAllRead));

export default router;
