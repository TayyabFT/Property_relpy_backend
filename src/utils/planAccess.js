/** Free trial length for new customer accounts */
export const TRIAL_DAYS = 7;

export function trialEndsAtFromNow(days = TRIAL_DAYS) {
  const ends = new Date();
  ends.setDate(ends.getDate() + days);
  return ends;
}

/**
 * True when the user may use plan-gated features:
 * - admin
 * - paid active subscription with a plan
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

  // Paid Stripe (or equivalent) subscription
  if (status === "active" && hasPaidSub) return true;

  // Active plan with no trial clock (admin-granted / legacy paid)
  if (status === "active" && !trialEndsAt) return true;

  // Complimentary free trial window
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

/** Whether the user is currently on an unexpired free trial (not a paid sub). */
export function isOnFreeTrial(user) {
  if (!user?.trialEndsAt || user.role === "admin") return false;
  if (user.stripeSubscriptionId) return false;
  const ends = new Date(user.trialEndsAt);
  return (
    ends > new Date() &&
    Boolean(user.plan) &&
    (user.subscriptionStatus === "trialing" ||
      user.subscriptionStatus === "active")
  );
}

/**
 * If the free trial has expired and there is no paid subscription,
 * clear local plan access fields on the user document (caller should save).
 */
export function expireTrialIfNeeded(user) {
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
    return true;
  }
  return false;
}
