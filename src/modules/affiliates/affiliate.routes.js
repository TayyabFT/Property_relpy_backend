import { Router } from "express";
import { protect, adminOnly } from "../../middleware/auth.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { affiliateService } from "./affiliate.service.js";

const router = Router();
router.post("/click", asyncHandler(async (req, res) => res.json({ success: true, data: await affiliateService.trackClick(req.body?.code) })));
router.use(protect);
router.get("/me", asyncHandler(async (req, res) => res.json({ success: true, data: await affiliateService.getMine(req.user.id) })));
router.use(adminOnly);
router.get("/", asyncHandler(async (_req, res) => res.json({ success: true, data: await affiliateService.list() })));
router.post("/", asyncHandler(async (req, res) => res.status(201).json({ success: true, data: await affiliateService.create(req.user.id, req.body) })));
router.get("/:id", asyncHandler(async (req, res) => res.json({ success: true, data: await affiliateService.getDetail(req.params.id) })));
router.patch("/:id", asyncHandler(async (req, res) => res.json({ success: true, data: await affiliateService.update(req.params.id, req.body) })));
router.post("/:id/payouts", asyncHandler(async (req, res) => res.json({ success: true, data: await affiliateService.markPaid(req.user.id, req.params.id, req.body) })));
router.post("/commissions/:id/void", asyncHandler(async (req, res) => res.json({ success: true, data: await affiliateService.voidCommission(req.params.id, req.body) })));
export default router;
