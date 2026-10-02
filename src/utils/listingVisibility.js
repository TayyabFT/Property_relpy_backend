import { User } from "../modules/auth/auth.model.js";
import { partnerListingsHidden } from "./invitedPartnerAccess.js";

// Query-time filtering means offers expire even when the seller never logs in.
// Listings remain stored and reappear automatically after a paid subscription.
export async function visibleListingsQuery(query = {}) {
  const now = new Date();
  const users = await User.find({ invitedPartnerEndsAt: { $lte: now, $ne: null } })
    .select("plan subscriptionStatus stripeSubscriptionId invitedPartnerEndsAt").lean();
  const hiddenIds = users.filter((user) => partnerListingsHidden(user, now)).map((user) => user._id);
  return { $and: [{ status: "live" }, query, { submittedBy: { $nin: hiddenIds } }] };
}
