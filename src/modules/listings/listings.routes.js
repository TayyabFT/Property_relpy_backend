import { Router } from "express";
import { protect, requireActivePlan } from "../../middleware/auth.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { listingsController } from "./listings.controller.js";

const router = Router();

router.use(protect, requireActivePlan);

router.get("/filters", asyncHandler(listingsController.getFilters));
router.get("/saved", asyncHandler(listingsController.getSavedListingIds));
router.get("/", asyncHandler(listingsController.getListings));
router.get("/:id", asyncHandler(listingsController.getListingById));
router.post("/:id/save", asyncHandler(listingsController.saveListing));
router.delete("/:id/save", asyncHandler(listingsController.unsaveListing));

export default router;
