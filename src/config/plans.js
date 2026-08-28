// Single source of truth for subscription plan pricing (backend side).
export const PLAN_CONFIG = {
  Premium: {
    priceGBP: 49,
    introPriceGBP: 35,
    introMonths: 3,
    purchasable: true,
  },
  VIP: { priceGBP: 79, purchasable: false },
  Ultra: { priceGBP: 99, purchasable: false },
  /**
   * Invite-only Founders Club / Commercial Partnership.
   * £25/mo fixed for 12 months, no listing fees, 5% success fee.
   * Not available for public self-checkout — admin invite required.
   */
  Commercial: {
    priceGBP: 25,
    purchasable: false,
    inviteOnly: true,
    termMonths: 12,
    waiveListingFee: true,
    successFeeRate: 0.05,
    label: "Founders Club",
  },
};

export const PLAN_NAMES = Object.keys(PLAN_CONFIG);
export const PURCHASABLE_PLANS = PLAN_NAMES.filter(
  (name) => PLAN_CONFIG[name].purchasable,
);

export const LISTING_FEE_GBP = 0;
/** Default success fee for standard members (share of sale price) */
export const SALE_COMMISSION_RATE = 0.1;
/** Commercial / Founders Club success fee (share of partner remuneration) */
export const COMMERCIAL_SUCCESS_FEE_RATE = 0.05;
export const COMMERCIAL_TERM_MONTHS = 12;

/** Complimentary Premium access for new accounts (days) */
export const FREE_TRIAL_DAYS = 7;
