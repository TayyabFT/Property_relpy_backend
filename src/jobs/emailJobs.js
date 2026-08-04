import { User } from "../modules/auth/auth.model.js";
import { env } from "../config/env.js";
import { emailService } from "../services/email.js";
import { PLAN_CONFIG, PURCHASABLE_PLANS } from "../config/plans.js";

const PLAN_PRICES = Object.fromEntries(
  Object.entries(PLAN_CONFIG).map(([name, config]) => [
    name,
    `£${config.priceGBP.toFixed(2)}`,
  ]),
);
const DEAL_ALERT_PREF = "New deal alerts (instant)";
const RENEWAL_PREF = "Membership renewal";

function formatCompactGbp(amount) {
  const value = Number(amount || 0);
  if (value >= 1_000_000) return `£${(value / 1_000_000).toFixed(1)}m`;
  if (value >= 1_000) return `£${Math.round(value / 1_000)}k`;
  return `£${value.toLocaleString("en-GB")}`;
}

function formatLongDate(date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

function dayBounds(daysAhead) {
  const target = new Date();
  target.setDate(target.getDate() + daysAhead);
  const start = new Date(target);
  start.setHours(0, 0, 0, 0);
  const end = new Date(target);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export async function notifyNewListingPublished(listing) {
  const users = await User.find({
    role: { $ne: "admin" },
    subscriptionStatus: "active",
    status: "active",
    notificationPrefs: DEAL_ALERT_PREF,
  }).select("firstName email");

  const listingUrl = `${env.clientUrl}/app/listings/${listing._id}`;
  const property = {
    title: listing.title,
    price: formatCompactGbp(listing.askingPrice),
    discount: `${listing.discountPercent || 0}%`,
    location: listing.location || "UK",
    url: listingUrl,
  };

  for (const user of users) {
    emailService.queueEmail(
      () =>
        emailService.sendNewDealAlert(
          user.email,
          user.firstName,
          property,
        ),
      `new-deal-alert:${user.email}`,
    );
  }
}

export async function runMembershipRenewalReminders() {
  const { start, end } = dayBounds(7);

  const users = await User.find({
    role: { $ne: "admin" },
    plan: { $in: PURCHASABLE_PLANS },
    subscriptionStatus: "active",
    status: "active",
    planRenewalDate: { $gte: start, $lte: end },
    notificationPrefs: RENEWAL_PREF,
  }).select("firstName email plan planRenewalDate");

  for (const user of users) {
    emailService.queueEmail(
      () =>
        emailService.sendMembershipReminder(
          user.email,
          user.firstName,
          user.plan,
          formatLongDate(user.planRenewalDate),
          PLAN_PRICES[user.plan] || "£0.00",
        ),
      `membership-renewal:${user.email}`,
    );
  }

  return users.length;
}

export function startMembershipRenewalJob() {
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

  const run = async () => {
    try {
      const count = await runMembershipRenewalReminders();
      if (count > 0) {
        console.log(`[cron] Sent ${count} membership renewal reminder(s)`);
      }
    } catch (err) {
      console.error("[cron] Membership renewal job failed:", err);
    }
  };

  run();
  setInterval(run, TWENTY_FOUR_HOURS);
  console.log("[cron] Membership renewal job scheduled (daily)");
}
