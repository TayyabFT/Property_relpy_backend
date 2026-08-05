import { Submission } from "../modules/overview/submission.model.js";
import { Listing } from "../modules/listings/listing.model.js";
import { ListingSave } from "../modules/listings/listingSave.model.js";
import { DealAnalysis } from "../modules/dealAnalysis/dealAnalysis.model.js";
import { notificationService } from "../modules/notifications/notification.service.js";

/** Free trial length for new customer accounts */
export const TRIAL_DAYS = 7;

export const PUBLISH_REQUIRES_MEMBERSHIP_MESSAGE =
  "Your free trial has ended. To publish your property and reach buyers, choose a membership.";

export function trialEndsAtFromNow(days = TRIAL_DAYS) {
  const ends = new Date();
  ends.setDate(ends.getDate() + days);
  return ends;
}

/**
 * True when the user may use plan-gated browse features:
 * - admin
 * - paid active subscription
 * - free trial still within trialEndsAt
 */
export function hasPlanAccess(user) {
  if (!user) return false;
  if (user.role === "admin") return true;

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

/** Paid membership required to publish listings (trial alone is not enough). */
export function hasPaidSubscription(user) {
  if (!user) return false;
  if (user.role === "admin") return true;
  return (
    user.subscriptionStatus === "active" &&
    Boolean(user.plan) &&
    Boolean(user.stripeSubscriptionId)
  );
}

/** Whether the user is currently on an unexpired free trial (not a paid sub). */
export function isOnFreeTrial(user) {
  if (!user || user.role === "admin") return false;
  if (user.stripeSubscriptionId) return false;
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
  if (user.stripeSubscriptionId) return false;
  if (user.trialEndsAt) return false;
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
        body: "Your free trial ended without a subscription, so your complimentary listing was removed. Subscribe and pay the £10 listing fee to publish again.",
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
  if (user.stripeSubscriptionId) return false;
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
