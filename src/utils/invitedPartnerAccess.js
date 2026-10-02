// Keep offer rules independent of database models so expiry is checked on every read.
export const INVITED_PARTNER_PLAN = "InvitedPartner";

export function partnerOfferEndsAt(start = new Date()) {
  const end = new Date(start);
  const day = end.getUTCDate();
  end.setUTCDate(1);
  end.setUTCMonth(end.getUTCMonth() + 2);
  const lastDay = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0)).getUTCDate();
  end.setUTCDate(Math.min(day, lastDay));
  return end;
}

export function isInvitedPartner(user, now = new Date()) {
  return Boolean(user && user.plan === INVITED_PARTNER_PLAN &&
    user.subscriptionStatus === "active" && user.invitedPartnerEndsAt &&
    new Date(user.invitedPartnerEndsAt) > now);
}

export function hasPostOfferSubscription(user) {
  return Boolean(user && user.plan && user.plan !== INVITED_PARTNER_PLAN &&
    user.subscriptionStatus === "active" && user.stripeSubscriptionId);
}

export function partnerListingsHidden(user, now = new Date()) {
  if (!user?.invitedPartnerEndsAt || new Date(user.invitedPartnerEndsAt) > now) return false;
  return !hasPostOfferSubscription(user);
}
