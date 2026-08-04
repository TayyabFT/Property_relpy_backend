import { kycService } from "./kyc.service.js";

export const kycController = {
  async getStatus(req, res) {
    const data = await kycService.getStatus(req.user.id);
    res.status(200).json({ success: true, data });
  },

  async startVerification(req, res) {
    const data = await kycService.startVerification(req.user.id);
    res.status(200).json({ success: true, message: data.message, data });
  },

  async handleWebhook(req, res) {
    const signature = req.headers["stripe-signature"];
    const result = await kycService.handleWebhook(req.body, signature);
    res.status(200).json({ success: true, ...result });
  },
};
