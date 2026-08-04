import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { protect } from "../../middleware/auth.middleware.js";
import { authController } from "./auth.controller.js";

const router = Router();

router.post("/register", asyncHandler(authController.register));
router.post("/login", asyncHandler(authController.login));
router.post("/forgot-password", asyncHandler(authController.forgotPassword));
router.post("/reset-password", asyncHandler(authController.resetPassword));
router.get("/verify-email", asyncHandler(authController.verifyEmail));
router.post("/verify-email", asyncHandler(authController.verifyEmail));
router.post("/logout", protect, asyncHandler(authController.logout));
router.get("/me", protect, asyncHandler(authController.me));
router.patch("/profile", protect, asyncHandler(authController.updateProfile));
router.post("/change-password", protect, asyncHandler(authController.changePassword));

export default router;
