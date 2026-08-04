import { notificationService } from "./notification.service.js";

export const notificationController = {
  async list(req, res) {
    const data = await notificationService.list(req.user.id);
    res.status(200).json({ success: true, data });
  },

  async markAllRead(req, res) {
    const data = await notificationService.markAllRead(req.user.id);
    res.status(200).json({ success: true, message: "All marked read", data });
  },
};
