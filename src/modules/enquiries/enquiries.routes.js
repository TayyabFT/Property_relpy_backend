import { Router } from "express";
import { protect, requireActivePlan } from "../../middleware/auth.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { enquiriesController } from "./enquiries.controller.js";

const router = Router();

router.use(protect, requireActivePlan);

router.get("/", asyncHandler(enquiriesController.list));
router.get("/unread-count", asyncHandler(enquiriesController.unreadCount));
router.get("/:id", asyncHandler(enquiriesController.getById));
router.post("/:id/reply", asyncHandler(enquiriesController.reply));
router.post("/:id/read", asyncHandler(enquiriesController.markRead));
router.post("/:id/close", asyncHandler(enquiriesController.close));

export default router;
