import { submitService } from "./submit.service.js";
import { parsePagination } from "../../utils/pagination.js";

export const submitController = {
  async getOptions(_req, res) {
    const data = submitService.getOptions();
    res.status(200).json({ success: true, data });
  },

  async previewDiscount(req, res) {
    const { askingPrice, marketValue } = req.body;
    const data = submitService.previewDiscount(askingPrice, marketValue);
    res.status(200).json({ success: true, data });
  },

  async createSubmission(req, res) {
    const data = await submitService.createSubmission(req.user.id, req.body);
    res.status(201).json({
      success: true,
      message: "Listing submitted at no charge for review.",
      data,
    });
  },

  async createCheckout(req, res) {
    const data = await submitService.createCheckoutForExistingSubmission(
      req.user.id,
      req.params.id,
    );
    res.status(200).json({ success: true, data });
  },

  async saveDraft(req, res) {
    const data = await submitService.saveDraft(
      req.user.id,
      req.body,
      req.body.draftId || null,
    );
    res.status(200).json({
      success: true,
      message: "Draft saved",
      data,
    });
  },

  async getDrafts(req, res) {
    const data = await submitService.getDrafts(req.user.id);
    res.status(200).json({ success: true, data });
  },

  async getSubmissions(req, res) {
    const { items, pagination } = await submitService.getSubmissions(req.user.id, parsePagination(req.query, { defaultLimit: 10 }));
    res.status(200).json({ success: true, data: items, pagination });
  },

  async getById(req, res) {
    const data = await submitService.getById(req.user.id, req.params.id);
    res.status(200).json({ success: true, data });
  },

  async updateDraft(req, res) {
    const data = await submitService.saveDraft(
      req.user.id,
      req.body,
      req.params.id,
    );
    res.status(200).json({
      success: true,
      message: "Draft updated",
      data,
    });
  },

  async deleteDraft(req, res) {
    const data = await submitService.deleteDraft(req.user.id, req.params.id);
    res.status(200).json({
      success: true,
      message: "Draft deleted",
      data,
    });
  },
};
