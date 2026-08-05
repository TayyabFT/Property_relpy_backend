import { Router } from "express";
import { protect } from "../../middleware/auth.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { submitController } from "./submit.controller.js";

const router = Router();

// Auth only — drafts allowed on trial; publish enforces paid membership in service
router.use(protect);

router.get("/options", asyncHandler(submitController.getOptions));
router.post("/preview-discount", asyncHandler(submitController.previewDiscount));
router.get("/drafts", asyncHandler(submitController.getDrafts));
router.get("/submissions", asyncHandler(submitController.getSubmissions));
router.post("/draft", asyncHandler(submitController.saveDraft));
router.post("/", asyncHandler(submitController.createSubmission));
router.post("/:id/checkout", asyncHandler(submitController.createCheckout));
router.get("/:id", asyncHandler(submitController.getById));
router.put("/:id", asyncHandler(submitController.updateDraft));
router.delete("/:id", asyncHandler(submitController.deleteDraft));

export default router;
