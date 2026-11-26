import { enquiriesService } from "./enquiries.service.js";
import { parsePagination } from "../../utils/pagination.js";

export const enquiriesController = {
  async list(req, res) {
    const raw = String(req.query.box || "all").toLowerCase();
    const box = ["inbox", "sent", "all"].includes(raw) ? raw : "all";
    const data = await enquiriesService.list(req.user.id, box, parsePagination(req.query));
    res.status(200).json({ success: true, data });
  },

  async unreadCount(req, res) {
    const data = await enquiriesService.unreadCount(req.user.id);
    res.status(200).json({ success: true, data });
  },

  async getById(req, res) {
    const data = await enquiriesService.getById(
      req.user.id,
      req.params.id,
    );
    res.status(200).json({ success: true, data });
  },

  async reply(req, res) {
    const data = await enquiriesService.reply(
      req.user.id,
      req.params.id,
      req.body,
    );
    res.status(200).json({
      success: true,
      message: "Reply sent",
      data,
    });
  },

  async markRead(req, res) {
    const data = await enquiriesService.markRead(
      req.user.id,
      req.params.id,
    );
    res.status(200).json({ success: true, data });
  },

  async close(req, res) {
    const data = await enquiriesService.close(req.user.id, req.params.id);
    res.status(200).json({ success: true, message: "Enquiry closed", data });
  },
};
