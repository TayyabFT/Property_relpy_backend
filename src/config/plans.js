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
};

export const PLAN_NAMES = Object.keys(PLAN_CONFIG);
export const PURCHASABLE_PLANS = PLAN_NAMES.filter(
  (name) => PLAN_CONFIG[name].purchasable,
);

export const LISTING_FEE_GBP = 10;
export const SALE_COMMISSION_RATE = 0.1;
