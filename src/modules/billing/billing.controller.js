import { ApiError } from "../../utils/ApiError.js";
import { User } from "../auth/auth.model.js";
import { billingService } from "./billing.service.js";

export const billingController = {
  async checkout(req, res) {
    const { plan } = req.body;
    if (!plan) throw new ApiError(400, "A plan is required");
    const user = await User.findById(req.user.id);
    const url = await billingService.createCheckoutSession(user, plan);
    res.status(200).json({ success: true, data: { url } });
  },

  async confirmCheckout(req, res) {
    const sessionId = req.query.session_id;
    if (!sessionId) throw new ApiError(400, "session_id is required");
    const user = await User.findById(req.user.id);
    const data = await billingService.confirmCheckoutSession(user, sessionId);
    res.status(200).json({ success: true, data });
  },

  async portal(req, res) {
    const user = await User.findById(req.user.id);
    const url = await billingService.createPortalSession(user);
    res.status(200).json({ success: true, data: { url } });
  },

  async startTrial(req, res) {
    const user = await User.findById(req.user.id);
    if (!user) throw new ApiError(404, "User not found");
    await billingService.startFreeTrial(user);
    const { authService } = await import("../auth/auth.service.js");
    const formatted = await authService.getProfile(req.user.id);
    res.status(200).json({
      success: true,
      message: "Your free trial has started.",
      data: { user: formatted },
    });
  },

  async webhook(req, res) {
    const signature = req.headers["stripe-signature"];
    await billingService.handleWebhookEvent(req.body, signature);
    res.status(200).json({ received: true });
  },
};
