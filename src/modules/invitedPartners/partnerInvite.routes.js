import { Router } from "express";
import { protect, adminOnly } from "../../middleware/auth.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { partnerInviteService } from "./partnerInvite.service.js";
import { authService } from "../auth/auth.service.js";
import { parsePagination } from "../../utils/pagination.js";

const router = Router();
router.use(protect);
router.post("/accept", asyncHandler(async (req, res) => {
  await partnerInviteService.accept(req.user.id, req.body?.code, req.body?.acknowledgeCancellation);
  const user = await authService.getProfile(req.user.id);
  res.json({ success: true, data: { user } });
}));
router.use(adminOnly);
router.get("/", asyncHandler(async (req, res) => {
  const { items, pagination } = await partnerInviteService.list(parsePagination(req.query));
  res.json({ success: true, data: items, pagination });
}));
router.post("/", asyncHandler(async (req, res) => res.status(201).json({ success: true, data: await partnerInviteService.create(req.user.id, req.body) })));
router.post("/:id/revoke", asyncHandler(async (req, res) => res.json({ success: true, data: await partnerInviteService.revoke(req.params.id) })));
export default router;
