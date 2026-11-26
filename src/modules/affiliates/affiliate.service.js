import crypto from "node:crypto";
import mongoose from "mongoose";
import { env } from "../../config/env.js";
import { AFFILIATE_COMMISSION_GBP } from "../../config/plans.js";
import { ApiError } from "../../utils/ApiError.js";
import { User } from "../auth/auth.model.js";
import { notificationService } from "../notifications/notification.service.js";
import { Affiliate, AffiliateCommission, AffiliatePayout } from "./affiliate.model.js";

const CODE_PATTERN = /^[A-Z0-9]{3,20}$/;

export function normalizeReferralCode(raw) {
  return typeof raw === "string" ? raw.trim().toUpperCase() : "";
}

function referralLink(code) {
  return `${env.clientUrl}/?ref=${encodeURIComponent(code)}`;
}

function roundGBP(value) {
  return Math.round(value * 100) / 100;
}

function shortName(user) {
  if (!user) return "Deleted user";
  const initial = user.lastName?.trim()?.[0];
  return initial ? `${user.firstName} ${initial.toUpperCase()}.` : user.firstName;
}

function parseCommission(value) {
  if (value === undefined || value === null || value === "") return AFFILIATE_COMMISSION_GBP;
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0 || amount > 1000) {
    throw new ApiError(400, "Commission must be between £0 and £1,000.");
  }
  return roundGBP(amount);
}

async function generateCode(firstName) {
  const prefix = (firstName || "").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 6) || "PR";
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = `${prefix}${crypto.randomInt(100, 1000)}`;
    if (!(await Affiliate.exists({ code }))) return code;
  }
  throw new ApiError(500, "Could not generate a unique referral code. Please enter one.");
}

async function findAffiliate(id) {
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid affiliate ID.");
  const affiliate = await Affiliate.findById(id).populate("user", "firstName lastName email");
  if (!affiliate) throw new ApiError(404, "Affiliate not found.");
  return affiliate;
}

/** Signups, paying customers and commission totals per affiliate id. */
async function statsFor(affiliateIds) {
  const [signups, commissions] = await Promise.all([
    User.aggregate([
      { $match: { referredByAffiliate: { $in: affiliateIds } } },
      { $group: { _id: "$referredByAffiliate", count: { $sum: 1 } } },
    ]),
    AffiliateCommission.aggregate([
      { $match: { affiliate: { $in: affiliateIds } } },
      {
        $group: {
          _id: { affiliate: "$affiliate", status: "$status" },
          count: { $sum: 1 },
          total: { $sum: "$amountGBP" },
        },
      },
    ]),
  ]);

  const stats = new Map(
    affiliateIds.map((id) => [
      String(id),
      { signups: 0, payingCustomers: 0, pendingGBP: 0, paidGBP: 0 },
    ]),
  );
  for (const row of signups) stats.get(String(row._id)).signups = row.count;
  for (const row of commissions) {
    const entry = stats.get(String(row._id.affiliate));
    if (row._id.status === "void") continue;
    entry.payingCustomers += row.count;
    if (row._id.status === "pending") entry.pendingGBP = roundGBP(row.total);
    if (row._id.status === "paid") entry.paidGBP = roundGBP(row.total);
  }
  return stats;
}

function formatAffiliate(affiliate, stats) {
  return {
    id: affiliate._id.toString(),
    code: affiliate.code,
    link: referralLink(affiliate.code),
    commissionGBP: affiliate.commissionGBP,
    status: affiliate.status,
    note: affiliate.note,
    clicks: affiliate.clicks,
    createdAt: affiliate.createdAt,
    user: affiliate.user?._id
      ? {
          id: affiliate.user._id.toString(),
          name: `${affiliate.user.firstName} ${affiliate.user.lastName}`.trim(),
          email: affiliate.user.email,
        }
      : null,
    ...stats,
  };
}

/** Full stats, referrals and payouts. Admins see referred users' emails; affiliates see short names only. */
async function buildReport(affiliate, { forAdmin }) {
  const [stats, referred, commissions, payouts] = await Promise.all([
    statsFor([affiliate._id]),
    User.find({ referredByAffiliate: affiliate._id })
      .sort({ createdAt: -1 })
      .limit(500)
      .select("firstName lastName email plan createdAt"),
    AffiliateCommission.find({ affiliate: affiliate._id }),
    AffiliatePayout.find({ affiliate: affiliate._id }).sort({ createdAt: -1 }).limit(100),
  ]);

  const commissionByUser = new Map(commissions.map((c) => [String(c.referredUser), c]));
  const referrals = referred.map((user) => {
    const commission = commissionByUser.get(String(user._id));
    return {
      id: user._id.toString(),
      name: forAdmin ? `${user.firstName} ${user.lastName}`.trim() : shortName(user),
      ...(forAdmin ? { email: user.email, plan: user.plan || null } : {}),
      joinedAt: user.createdAt,
      commission: commission
        ? {
            id: commission._id.toString(),
            amountGBP: commission.amountGBP,
            status: commission.status,
            earnedAt: commission.createdAt,
            paidAt: commission.paidAt,
            ...(forAdmin ? { voidReason: commission.voidReason } : {}),
          }
        : null,
    };
  });

  return {
    ...formatAffiliate(affiliate, stats.get(String(affiliate._id))),
    referrals,
    payouts: payouts.map((p) => ({
      id: p._id.toString(),
      amountGBP: p.amountGBP,
      commissionCount: p.commissionCount,
      reference: p.reference,
      paidAt: p.createdAt,
    })),
  };
}

export const affiliateService = {
  /** Public: count a referral-link visit. Returns whether the code can be used. */
  async trackClick(rawCode) {
    const code = normalizeReferralCode(rawCode);
    if (!CODE_PATTERN.test(code)) return { valid: false };
    const result = await Affiliate.updateOne({ code, status: "active" }, { $inc: { clicks: 1 } });
    return { valid: result.matchedCount > 0 };
  },

  /** Affiliate to credit for a new signup, or null when no code was given. */
  async resolveForSignup(rawCode) {
    const code = normalizeReferralCode(rawCode);
    if (!code) return null;
    const affiliate = await Affiliate.findOne({ code, status: "active" });
    if (!affiliate) {
      throw new ApiError(400, "That referral code isn't recognised. Check it, or leave the box empty.");
    }
    return affiliate;
  },

  /**
   * Credit the referring affiliate once, on the referred user's first paid subscription payment.
   * Safe to call repeatedly (checkout confirm, webhook retries, renewals).
   */
  async recordFirstPayment(userId, { reference = "", amountPaidPence = 0 } = {}) {
    const user = await User.findById(userId).select("firstName lastName referredByAffiliate");
    if (!user?.referredByAffiliate) return null;
    const affiliate = await Affiliate.findById(user.referredByAffiliate);
    if (!affiliate) return null;

    let commission;
    try {
      commission = await AffiliateCommission.create({
        affiliate: affiliate._id,
        referredUser: user._id,
        amountGBP: affiliate.commissionGBP,
        paymentReference: reference,
        paymentAmountGBP: roundGBP(amountPaidPence / 100),
      });
    } catch (err) {
      if (err?.code === 11000) return null; // already credited
      throw err;
    }

    await notificationService.create(affiliate.user, {
      type: "system",
      title: `You earned £${commission.amountGBP} commission`,
      body: `${shortName(user)} made their first subscription payment. Your £${commission.amountGBP} commission is waiting to be paid out.`,
    });
    return commission;
  },

  async getMine(userId) {
    const affiliate = await Affiliate.findOne({ user: userId });
    if (!affiliate) throw new ApiError(404, "Your account is not an affiliate account.");
    return buildReport(affiliate, { forAdmin: false });
  },

  async list() {
    const affiliates = await Affiliate.find()
      .sort({ createdAt: -1 })
      .populate("user", "firstName lastName email");
    const stats = await statsFor(affiliates.map((a) => a._id));
    return affiliates.map((a) => formatAffiliate(a, stats.get(String(a._id))));
  },

  async getDetail(id) {
    return buildReport(await findAffiliate(id), { forAdmin: true });
  },

  async create(adminId, { email, code, commissionGBP, note } = {}) {
    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    if (!normalizedEmail) throw new ApiError(400, "Email is required.");

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      throw new ApiError(404, "No PropertyReply account uses this email. Ask them to sign up first, then add them here.");
    }
    if (user.role === "admin") throw new ApiError(400, "Admin accounts can't be affiliates.");
    if (await Affiliate.exists({ user: user._id })) {
      throw new ApiError(409, "This person is already an affiliate.");
    }

    let finalCode = normalizeReferralCode(code);
    if (finalCode) {
      if (!CODE_PATTERN.test(finalCode)) {
        throw new ApiError(400, "Referral codes must be 3–20 letters or numbers.");
      }
      if (await Affiliate.exists({ code: finalCode })) {
        throw new ApiError(409, "That referral code is already taken.");
      }
    } else {
      finalCode = await generateCode(user.firstName);
    }

    let affiliate;
    try {
      affiliate = await Affiliate.create({
        user: user._id,
        code: finalCode,
        commissionGBP: parseCommission(commissionGBP),
        note: typeof note === "string" ? note.trim().slice(0, 200) : "",
        createdBy: adminId,
      });
    } catch (err) {
      if (err?.code === 11000) throw new ApiError(409, "This person or referral code is already in use.");
      throw err;
    }
    await User.updateOne({ _id: user._id }, { isAffiliate: true });

    await notificationService.create(user._id, {
      type: "system",
      title: "You're now a PropertyReply affiliate",
      body: `Share your link ${referralLink(finalCode)} or code ${finalCode}. You earn £${affiliate.commissionGBP} when someone you refer pays for their first subscription. Track everything on your Affiliate page.`,
    });

    return this.getDetail(affiliate._id);
  },

  async update(id, { status, commissionGBP, note } = {}) {
    const affiliate = await findAffiliate(id);
    if (status !== undefined) {
      if (!["active", "paused"].includes(status)) throw new ApiError(400, "Invalid status.");
      affiliate.status = status;
    }
    // Applies to future commissions only; earned ones keep their amount.
    if (commissionGBP !== undefined) affiliate.commissionGBP = parseCommission(commissionGBP);
    if (note !== undefined) affiliate.note = String(note).trim().slice(0, 200);
    await affiliate.save();
    return this.getDetail(id);
  },

  /** Record that every pending commission for this affiliate has been paid manually. */
  async markPaid(adminId, id, { reference } = {}) {
    const affiliate = await findAffiliate(id);
    const cleanReference = typeof reference === "string" ? reference.trim().slice(0, 200) : "";
    let payout;

    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const pending = await AffiliateCommission.find({
          affiliate: affiliate._id,
          status: "pending",
        }).session(session);
        if (!pending.length) throw new ApiError(400, "This affiliate has no unpaid commission.");

        [payout] = await AffiliatePayout.create(
          [{
            affiliate: affiliate._id,
            amountGBP: roundGBP(pending.reduce((sum, c) => sum + c.amountGBP, 0)),
            commissionCount: pending.length,
            reference: cleanReference,
            paidBy: adminId,
          }],
          { session },
        );
        await AffiliateCommission.updateMany(
          { _id: { $in: pending.map((c) => c._id) }, status: "pending" },
          { status: "paid", payout: payout._id, paidAt: payout.createdAt },
          { session },
        );
      });
    } finally {
      await session.endSession();
    }

    await notificationService.create(affiliate.user?._id, {
      type: "system",
      title: "Affiliate commission paid",
      body: `We've paid you £${payout.amountGBP} for ${payout.commissionCount} referral${payout.commissionCount === 1 ? "" : "s"}.${cleanReference ? ` Reference: ${cleanReference}` : ""}`,
    });
    return this.getDetail(id);
  },

  /** Cancel an unpaid commission, e.g. after a refund or a fake signup. */
  async voidCommission(commissionId, { reason } = {}) {
    if (!mongoose.isValidObjectId(commissionId)) throw new ApiError(400, "Invalid commission ID.");
    const commission = await AffiliateCommission.findOneAndUpdate(
      { _id: commissionId, status: "pending" },
      {
        status: "void",
        voidReason: typeof reason === "string" ? reason.trim().slice(0, 200) : "",
      },
      { new: true },
    );
    if (!commission) throw new ApiError(409, "Only unpaid commissions can be cancelled.");
    return this.getDetail(commission.affiliate);
  },
};
