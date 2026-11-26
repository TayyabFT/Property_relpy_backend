import { Router } from "express";
import { protect, adminOnly } from "../../middleware/auth.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { parsePagination } from "../../utils/pagination.js";
import { affiliateService } from "./affiliate.service.js";

const router = Router();
router.post("/click", asyncHandler(async (req, res) => res.json({ success: true, data: await affiliateService.trackClick(req.body?.code) })));
router.use(protect);
router.get("/me", asyncHandler(async (req, res) => res.json({ success: true, data: await affiliateService.getMine(req.user.id, parsePagination(req.query)) })));
router.use(adminOnly);
router.get("/", asyncHandler(async (req, res) => {
  const { items, pagination, totalUnpaidGBP } = await affiliateService.list(parsePagination(req.query));
  res.json({ success: true, data: items, pagination, totalUnpaidGBP });
}));
router.post("/", asyncHandler(async (req, res) => res.status(201).json({ success: true, data: await affiliateService.create(req.user.id, req.body) })));
router.get("/:id", asyncHandler(async (req, res) => res.json({ success: true, data: await affiliateService.getDetail(req.params.id, parsePagination(req.query)) })));
router.patch("/:id", asyncHandler(async (req, res) => res.json({ success: true, data: await affiliateService.update(req.params.id, req.body) })));
router.post("/:id/payouts", asyncHandler(async (req, res) => res.json({ success: true, data: await affiliateService.markPaid(req.user.id, req.params.id, req.body) })));
router.post("/commissions/:id/void", asyncHandler(async (req, res) => res.json({ success: true, data: await affiliateService.voidCommission(req.params.id, req.body) })));
export default router;
