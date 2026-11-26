import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { protect, adminOnly } from "../../middleware/auth.middleware.js";
import { adminController } from "./admin.controller.js";

const router = Router();

router.use(protect, adminOnly);

router.get("/stats", asyncHandler(adminController.stats));

router.get("/submissions", asyncHandler(adminController.submissions));
router.post("/submissions/:id/approve", asyncHandler(adminController.approveSubmission));
router.post("/submissions/:id/reject", asyncHandler(adminController.rejectSubmission));

router.get("/users", asyncHandler(adminController.users));
router.patch("/users/:id", asyncHandler(adminController.updateUser));
router.delete("/users/:id", asyncHandler(adminController.deleteUser));

router.get("/admins", asyncHandler(adminController.listAdmins));
router.post("/admins", asyncHandler(adminController.createAdmin));

router.get("/reports", asyncHandler(adminController.reports));
router.patch("/reports/:id/resolve", asyncHandler(adminController.resolveReport));

router.get("/listings", asyncHandler(adminController.listings));
router.get("/listings/:id", asyncHandler(adminController.listingDetail));
router.delete("/listings/:id", asyncHandler(adminController.removeListing));
router.patch("/listings/:id/featured", asyncHandler(adminController.toggleFeatured));
router.post("/listings/:id/mark-sold", asyncHandler(adminController.markSold));

router.get("/commercial-invites", asyncHandler(adminController.listCommercialInvites));
router.post("/commercial-invites", asyncHandler(adminController.createCommercialInvite));
router.post(
  "/commercial-invites/:id/revoke",
  asyncHandler(adminController.revokeCommercialInvite),
);
router.post(
  "/users/:id/grant-commercial",
  asyncHandler(adminController.grantCommercial),
);

export default router;
