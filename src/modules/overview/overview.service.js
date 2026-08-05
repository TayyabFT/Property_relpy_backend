import { ApiError } from "../../utils/ApiError.js";
import { User } from "../auth/auth.model.js";
import { ListingSave } from "../listings/listingSave.model.js";
import { Submission } from "./submission.model.js";
import { PLAN_CONFIG } from "../../config/plans.js";
import {
  isOnFreeTrial,
  hasPaidSubscription,
  expireTrialIfNeeded,
} from "../../utils/planAccess.js";

function planPriceLabel(plan) {
  const config = PLAN_CONFIG[plan];
  if (!config) return "";
  if (config.introPriceGBP) {
    return `£${config.introPriceGBP.toFixed(2)} / month (first ${config.introMonths} months, then £${config.priceGBP.toFixed(2)})`;
  }
  return `£${config.priceGBP.toFixed(2)} / month`;
}

const STATUS_LABELS = {
  live: "Live",
  pending: "Pending Review",
  rejected: "Rejected",
};

const STATUS_COLORS = {
  live: "var(--green)",
  pending: "var(--amber)",
  rejected: "var(--red)",
};

function formatCompactGbp(amount) {
  if (amount >= 1_000_000) {
    return `£${(amount / 1_000_000).toFixed(1)}m`;
  }
  if (amount >= 1_000) {
    return `£${Math.round(amount / 1_000)}k`;
  }
  return `£${amount}`;
}

function formatGbp(amount) {
  return `£${amount.toLocaleString("en-GB")}`;
}

function formatShortDate(date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
  }).format(new Date(date));
}

function relativeSavedLabel(date) {
  const diffMs = Date.now() - new Date(date).getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));

  if (hours < 1) return "Added just now";
  if (hours < 24) return `Added ${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Saved yesterday";
  return `Saved ${days}d ago`;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function formatLongDate(date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

function membershipBadgeClass(plan, { onTrial = false } = {}) {
  if (onTrial) return "tag badge-blue";
  if (plan === "Ultra") return "tag";
  if (plan === "VIP") return "tag badge-amber";
  if (plan === "Premium") return "tag badge-green";
  return "tag badge-blue";
}

function buildMembershipPayload(user) {
  const onTrial = isOnFreeTrial(user);
  const paid = hasPaidSubscription(user);

  if (onTrial) {
    const endsAt = user.trialEndsAt
      ? formatLongDate(user.trialEndsAt)
      : "—";
    return {
      plan: "Free Trial",
      status: "Trialing",
      billingLabel: "Free Trial (Premium access)",
      renewsAt: endsAt,
      price: "£0.00 — 7-day trial",
      badgeLabel: "Free Trial · Active",
      badgeClass: membershipBadgeClass(user.plan, { onTrial: true }),
      onTrial: true,
    };
  }

  if (!user.plan || (!paid && user.subscriptionStatus !== "active")) {
    return {
      plan: "None",
      status: "None",
      billingLabel: "No active plan",
      renewsAt: "—",
      price: "—",
      badgeLabel: "No Plan",
      badgeClass: "tag badge-blue",
      onTrial: false,
    };
  }

  const renewsAt = user.planRenewalDate || addDays(user.createdAt || new Date(), 30);
  return {
    plan: user.plan,
    status: "Active",
    billingLabel: `${user.plan} Monthly`,
    renewsAt: formatLongDate(renewsAt),
    price: planPriceLabel(user.plan),
    badgeLabel: `${user.plan} · Active`,
    badgeClass: membershipBadgeClass(user.plan),
    onTrial: false,
  };
}

export const overviewService = {
  async getOverview(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    if (await expireTrialIfNeeded(user)) {
      await user.save();
    }

    const [submissions, savedListings] = await Promise.all([
      Submission.find({ userId, status: { $ne: "draft" } })
        .sort({ submittedAt: -1 })
        .limit(10),
      ListingSave.find({ userId })
        .sort({ savedAt: -1 })
        .limit(10)
        .populate({ path: "listingId" }),
    ]);

    const savedProperties = savedListings.filter((item) => item.listingId);

    const savedCount = await ListingSave.countDocuments({ userId });
    const submissionCount = await Submission.countDocuments({
      userId,
      status: { $ne: "draft" },
    });
    const liveCount = await Submission.countDocuments({
      userId,
      status: "live",
    });
    const pendingCount = await Submission.countDocuments({
      userId,
      status: "pending",
    });

    const stats = [
      {
        label: "Saved Deals",
        value: String(savedCount),
        valueClass: "gold",
        trend: "neutral",
      },
      {
        label: "Submissions",
        value: String(submissionCount),
        change: `${liveCount} live, ${pendingCount} pending`,
        trend: "neutral",
      },
    ];

    return {
      stats,
      membership: buildMembershipPayload(user),
      submissions: submissions.map((item) => ({
        id: item._id.toString(),
        property: item.property,
        location: item.location,
        price: formatCompactGbp(item.askingPrice),
        discount: `${item.discountPercent}%`,
        status: STATUS_LABELS[item.status],
        statusKey: item.status,
        statusColor: STATUS_COLORS[item.status],
        submitted: formatShortDate(item.submittedAt),
      })),
      savedProperties: savedProperties.map((item) => {
        const listing = item.listingId;
        return {
          id: listing._id.toString(),
          title: listing.title,
          meta: `${formatCompactGbp(listing.askingPrice)} asking · ${listing.discountPercent}% below market · ${relativeSavedLabel(item.savedAt)}`,
        };
      }),
      savedCount,
    };
  },

  async removeSavedProperty(userId, listingId) {
    const saved = await ListingSave.findOne({ userId, listingId });
    if (!saved) {
      throw new ApiError(404, "Saved property not found");
    }
    await saved.deleteOne();
    return { deleted: true };
  },
};
