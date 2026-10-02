import { Submission } from "../modules/overview/submission.model.js";
import { isInvitedPartner, INVITED_PARTNER_PLAN, hasPostOfferSubscription } from "./invitedPartnerAccess.js";
import { Listing } from "../modules/listings/listing.model.js";
import { ListingSave } from "../modules/listings/listingSave.model.js";
import { DealAnalysis } from "../modules/dealAnalysis/dealAnalysis.model.js";
import { notificationService } from "../modules/notifications/notification.service.js";
import {
  SALE_COMMISSION_RATE,
  COMMERCIAL_SUCCESS_FEE_RATE,
  PLAN_CONFIG,
} from "../config/plans.js";

/** Free trial length for new customer accounts */
export const TRIAL_DAYS = 7;

export const PUBLISH_REQUIRES_MEMBERSHIP_MESSAGE =
  "Your free trial has ended. To publish your property and reach buyers, choose a membership.";

export function trialEndsAtFromNow(days = TRIAL_DAYS) {
  const ends = new Date();
  ends.setDate(ends.getDate() + days);
  return ends;
}

export function commercialEndsAtFromNow(months = PLAN_CONFIG.Commercial?.termMonths || 12) {
  const ends = new Date();
  ends.setMonth(ends.getMonth() + months);
  return ends;
}

/**
 * Active invite-only Founders Club / Commercial Partnership.
 * Admin-granted or activated via invite + Stripe £25/mo.
 */
export function isCommercialPartner(user) {
  if (!user || user.role === "admin") return false;
  if (user.plan !== "Commercial") return false;
  if (user.subscriptionStatus !== "active") return false;

  const ends = user.commercialPartnershipEndsAt
    ? new Date(user.commercialPartnershipEndsAt)
    : null;
  if (ends && ends < new Date()) return false;

  return true;
}

/** Listing fees are free for all members (including Founders Club). */
export function listingFeeWaived(_user) {
  return true;
}

/**
 * Success fee rate:
 * - Commercial / Founders Club: 5% of partner remuneration
 * - Standard members: 10% of sale price
 */
export function getSuccessFeeRate(user) {
  if (isInvitedPartner(user)) return 0.05;
  if (user?.invitedPartnerStartedAt) return SALE_COMMISSION_RATE;
  if (isCommercialPartner(user)) {
    return (
      PLAN_CONFIG.Commercial?.successFeeRate ?? COMMERCIAL_SUCCESS_FEE_RATE
    );
  }
  return SALE_COMMISSION_RATE;
}

/**
 * True when the user may use plan-gated browse features:
 * - admin
 * - paid active subscription
 * - commercial partnership within term
 * - free trial still within trialEndsAt
 */
export function hasPlanAccess(user) {
  if (!user) return false;
  if (user.role === "admin") return true;
  if (user.plan === INVITED_PARTNER_PLAN) return isInvitedPartner(user);
  if (user.invitedPartnerStartedAt) return hasPostOfferSubscription(user);
  if (isCommercialPartner(user)) return true;

  const plan = user.plan;
  if (!plan) return false;

  const status = user.subscriptionStatus || "none";
  const trialEndsAt = user.trialEndsAt ? new Date(user.trialEndsAt) : null;
  const now = new Date();
  const hasPaidSub = Boolean(user.stripeSubscriptionId);

  if (status === "active" && hasPaidSub) return true;
  if (status === "active" && !trialEndsAt) return true;

  if (
    trialEndsAt &&
    trialEndsAt > now &&
    (status === "trialing" || status === "active") &&
    !hasPaidSub
  ) {
    return true;
  }

  return false;
}

/**
 * Membership required to publish listings.
 * Commercial partners (invite-granted or Stripe) qualify; free trial alone does not.
 */
export function hasPaidSubscription(user) {
  if (!user) return false;
  if (user.role === "admin") return true;
  // This legacy helper also represents publishing entitlement.
  if (user.plan === INVITED_PARTNER_PLAN) return isInvitedPartner(user);
  if (user.invitedPartnerStartedAt) return hasPostOfferSubscription(user);
  if (isCommercialPartner(user)) return true;
  return (
    user.subscriptionStatus === "active" &&
    Boolean(user.plan) &&
    Boolean(user.stripeSubscriptionId)
  );
}

/** Whether the user is currently on an unexpired free trial (not a paid sub). */
export function isOnFreeTrial(user) {
  if (!user || user.role === "admin") return false;
  if (user.invitedPartnerStartedAt) return false;
  if (user.stripeSubscriptionId) return false;
  if (isCommercialPartner(user)) return false;
  if (!user.plan) return false;

  const ends = user.trialEndsAt ? new Date(user.trialEndsAt) : null;
  if (ends && ends > new Date()) {
    return (
      user.subscriptionStatus === "trialing" ||
      user.subscriptionStatus === "active"
    );
  }

  // Trial started but trialEndsAt missing (legacy / partial records)
  return user.subscriptionStatus === "trialing";
}

/** Eligible to opt in to a one-time 7-day free trial. */
export function canStartFreeTrial(user) {
  if (!user || user.role === "admin") return false;
  if (user.invitedPartnerStartedAt) return false;
  if (user.stripeSubscriptionId) return false;
  if (user.trialEndsAt) return false;
  if (isCommercialPartner(user)) return false;
  if (hasPaidSubscription(user) || isOnFreeTrial(user)) return false;
  return true;
}

/**
 * Remove complimentary trial listings/submissions for a user who did not subscribe.
 * (Legacy cleanup for any earlier free-trial listings.)
 */
export async function removeTrialListingsForUser(userId) {
  if (!userId) return { removedSubmissions: 0, removedListings: 0 };

  const trialSubs = await Submission.find({
    userId,
    isTrialListing: true,
  }).select("_id");
  const submissionIds = trialSubs.map((s) => s._id);

  const listings = await Listing.find({
    $or: [
      { isTrialListing: true, submittedBy: userId },
      ...(submissionIds.length
        ? [{ sourceSubmissionId: { $in: submissionIds } }]
        : []),
    ],
  }).select("_id");

  const listingIds = listings.map((l) => l._id);

  if (listingIds.length) {
    await DealAnalysis.deleteMany({ listingId: { $in: listingIds } });
    await ListingSave.deleteMany({ listingId: { $in: listingIds } });
    await Listing.deleteMany({ _id: { $in: listingIds } });
  }

  if (submissionIds.length) {
    await Submission.deleteMany({ _id: { $in: submissionIds } });
  }

  if (submissionIds.length || listingIds.length) {
    try {
      await notificationService.create(userId, {
        type: "system",
        title: "Trial listing removed",
        body: "Your free trial ended without a subscription, so your complimentary listing was removed. Subscribe to publish again — listing submissions are free for members.",
      });
    } catch {
      // non-critical
    }
  }

  return {
    removedSubmissions: submissionIds.length,
    removedListings: listingIds.length,
  };
}

/**
 * If the free trial has expired and there is no paid subscription,
 * clear local plan access and remove any legacy trial listings.
 */
export async function expireTrialIfNeeded(user) {
  if (!user || user.role === "admin") return false;
  if (user.invitedPartnerStartedAt) return false;
  if (user.stripeSubscriptionId) return false;
  if (user.plan === "Commercial") return false;
  if (!user.trialEndsAt) return false;

  const ends = new Date(user.trialEndsAt);
  if (ends > new Date()) return false;

  if (
    user.subscriptionStatus === "trialing" ||
    (user.subscriptionStatus === "active" && user.plan)
  ) {
    user.subscriptionStatus = "none";
    user.plan = null;
    await removeTrialListingsForUser(user._id);
    return true;
  }

  await removeTrialListingsForUser(user._id);
  return false;
}

/** Clear Commercial access when the 12-month partnership term ends. */
export async function expireCommercialIfNeeded(user) {
  if (!user || user.role === "admin") return false;
  if (user.plan !== "Commercial") return false;
  if (!user.commercialPartnershipEndsAt) return false;

  const ends = new Date(user.commercialPartnershipEndsAt);
  if (ends > new Date()) return false;

  user.plan = null;
  user.subscriptionStatus = "none";
  user.commercialPartnershipEndsAt = null;
  // Keep stripeSubscriptionId so billing portal can still cancel if needed
  return true;
}
