import crypto from "node:crypto";
import mongoose from "mongoose";
import { PartnerInvite } from "./partnerInvite.model.js";
import { User } from "../auth/auth.model.js";
import { ApiError } from "../../utils/ApiError.js";
import { env } from "../../config/env.js";
import { billingService } from "../billing/billing.service.js";
import { INVITED_PARTNER_PLAN, partnerOfferEndsAt } from "../../utils/invitedPartnerAccess.js";

function formatInvite(invite) {
  return {
    id: String(invite._id), code: invite.code, email: invite.email, note: invite.note,
    status: invite.status === "active" && invite.expiresAt <= new Date() ? "expired" : invite.status,
    expiresAt: invite.expiresAt, usedAt: invite.usedAt, offerEndsAt: invite.offerEndsAt,
    inviteUrl: `${env.clientUrl.replace(/\/$/, "")}/partner-invite?code=${encodeURIComponent(invite.code)}`,
  };
}

export const partnerInviteService = {
  async create(adminId, { email, note = "", daysValid = 30 } = {}) {
    if (typeof email !== "string" || email.length > 254 || !/^\S+@\S+\.\S+$/.test(email.trim())) {
      throw new ApiError(400, "Enter a valid recipient email address.");
    }
    if (typeof note !== "string" || note.length > 200) throw new ApiError(400, "Note must be 200 characters or fewer.");
    const days = Number(daysValid);
    if (!Number.isInteger(days) || days < 1 || days > 90) throw new ApiError(400, "Invite validity must be 1–90 days.");
    const invite = await PartnerInvite.create({
      code: `IP-${crypto.randomBytes(24).toString("hex").toUpperCase()}`,
      email: email.trim().toLowerCase(), note: note.trim(), createdBy: adminId,
      expiresAt: new Date(Date.now() + days * 86400000),
    });
    return formatInvite(invite);
  },

  async list() {
    return (await PartnerInvite.find().sort({ createdAt: -1 }).limit(200)).map(formatInvite);
  },

  async revoke(id) {
    if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid invitation ID.");
    const invite = await PartnerInvite.findOneAndUpdate({ _id: id, status: "active" }, { status: "revoked" }, { new: true });
    if (!invite) throw new ApiError(409, "Invitation has already been accepted or revoked.");
    return formatInvite(invite);
  },

  async accept(userId, rawCode, acknowledgeCancellation = false) {
    if (typeof rawCode !== "string" || !/^IP-[A-F0-9]{48}$/i.test(rawCode.trim())) {
      throw new ApiError(400, "Invalid invitation code.");
    }
    const code = rawCode.trim().toUpperCase();
    const existingUser = await User.findById(userId);
    const existingInvite = await PartnerInvite.findOne({ code });
    if (!existingUser || existingUser.role === "admin" || existingUser.status !== "active") throw new ApiError(403, "An active member account is required.");
    if (!existingInvite || existingInvite.email !== existingUser.email.toLowerCase()) throw new ApiError(403, "This invitation is invalid or belongs to a different email address.");
    if (existingInvite.status === "used" && String(existingInvite.usedBy) === String(userId)) return;
    if (existingInvite.status !== "active" || existingInvite.expiresAt <= new Date()) throw new ApiError(409, "This invitation is no longer available.");
    if (existingUser.invitedPartnerStartedAt) throw new ApiError(409, "Your account has already used an Invited Partner offer.");
    if (existingUser.stripeSubscriptionId) {
      if (acknowledgeCancellation !== true) throw new ApiError(400, "Please acknowledge that your existing subscription will be cancelled immediately.");
      // Cancel before granting free access. If Stripe fails, nothing is redeemed.
      // A database retry can safely retrieve the already-cancelled subscription.
      await billingService.cancelForPartnerOffer(existingUser);
    }
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const user = await User.findById(userId).session(session);
        const invite = await PartnerInvite.findOne({ code }).session(session);
        if (!user || user.role === "admin" || user.status !== "active") throw new ApiError(403, "An active member account is required.");
        if (!invite || invite.email !== user.email.toLowerCase()) throw new ApiError(403, "This invitation is invalid or belongs to a different email address.");
        // Safe retries never reset or extend the two-month clock.
        if (invite.status === "used" && String(invite.usedBy) === String(user._id)) return;
        if (invite.status !== "active" || invite.expiresAt <= new Date()) throw new ApiError(409, "This invitation has expired, was revoked, or has already been used.");
        if (user.invitedPartnerStartedAt) throw new ApiError(409, "Your account has already used an Invited Partner offer.");
        if (user.stripeSubscriptionId && user.stripeSubscriptionId !== existingUser.stripeSubscriptionId) throw new ApiError(409, "Your subscription changed. Please reload and accept again.");
        const start = new Date();
        const end = partnerOfferEndsAt(start);
        user.plan = INVITED_PARTNER_PLAN;
        user.subscriptionStatus = "active";
        user.invitedPartnerStartedAt = start;
        user.invitedPartnerEndsAt = end;
        user.trialEndsAt = null;
        user.commercialPartnershipEndsAt = null;
        user.stripeSubscriptionId = "";
        user.planRenewalDate = null;
        invite.status = "used";
        invite.usedBy = user._id;
        invite.usedAt = start;
        invite.offerEndsAt = end;
        await user.save({ session });
        await invite.save({ session });
      });
    } catch (error) {
      if (existingUser.stripeSubscriptionId) {
        throw new ApiError(error.statusCode || 503, "Your previous subscription was cancelled, but the offer could not be activated. Retry this invitation; if it is no longer available, contact the administrator.");
      }
      throw error;
    } finally {
      await session.endSession();
    }
  },
};
