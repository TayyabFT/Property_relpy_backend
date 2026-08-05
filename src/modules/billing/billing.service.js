import Stripe from "stripe";
import { env } from "../../config/env.js";
import { ApiError } from "../../utils/ApiError.js";
import { User } from "../auth/auth.model.js";
import { Submission } from "../overview/submission.model.js";
import { Listing } from "../listings/listing.model.js";
import { notificationService } from "../notifications/notification.service.js";
import {
  PLAN_CONFIG,
  LISTING_FEE_GBP,
  SALE_COMMISSION_RATE,
} from "../../config/plans.js";
import {
  TRIAL_DAYS,
  trialEndsAtFromNow,
  canStartFreeTrial,
  isOnFreeTrial,
  hasPaidSubscription,
} from "../../utils/planAccess.js";

const INTRO_COUPON_ID = "intro-premium-3mo-v35";

let stripeClient = null;
let premiumPriceId = null;

function stripe() {
  if (!env.stripeSecretKey) {
    throw new ApiError(
      503,
      "Payments are not configured yet. Please contact support.",
    );
  }
  if (!stripeClient) {
    stripeClient = new Stripe(env.stripeSecretKey);
  }
  return stripeClient;
}

function requirePremiumPrice() {
  if (!premiumPriceId) {
    throw new ApiError(
      503,
      "Payments are not configured yet. Please contact support.",
    );
  }
  return premiumPriceId;
}

function isMissingStripeCustomerError(err) {
  return (
    err?.code === "resource_missing" ||
    /No such customer/i.test(err?.message || "")
  );
}

/**
 * Return a Stripe customer id that exists in the current Stripe account.
 * Clears stale IDs left over from test↔live key switches or deleted customers.
 */
async function resolveStripeCustomerId(user) {
  if (!user?.stripeCustomerId) return null;

  try {
    await stripe().customers.retrieve(user.stripeCustomerId);
    return user.stripeCustomerId;
  } catch (err) {
    if (!isMissingStripeCustomerError(err)) throw err;

    console.warn(
      `[billing] Clearing stale Stripe customer ${user.stripeCustomerId} for user ${user._id}`,
    );
    user.stripeCustomerId = "";
    await User.findByIdAndUpdate(user._id, {
      stripeCustomerId: "",
      stripeSubscriptionId: "",
    });
    return null;
  }
}

async function getOrCreateStripeCustomer(user) {
  const existing = await resolveStripeCustomerId(user);
  if (existing) return existing;

  const customer = await stripe().customers.create({
    email: user.email,
    name: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
    metadata: { userId: user._id.toString() },
  });

  user.stripeCustomerId = customer.id;
  await User.findByIdAndUpdate(user._id, { stripeCustomerId: customer.id });
  return customer.id;
}

async function applySubscriptionToUser(userId, session) {
  const subscription = session.subscription;
  const update = {
    plan: session.metadata?.plan || "Premium",
    subscriptionStatus: "active",
    // Paid subscription replaces the complimentary trial
    trialEndsAt: null,
    stripeCustomerId: session.customer,
    stripeSubscriptionId:
      typeof subscription === "string" ? subscription : subscription?.id,
  };
  if (subscription?.current_period_end) {
    update.planRenewalDate = new Date(subscription.current_period_end * 1000);
  }
  await User.findByIdAndUpdate(userId, update);
}

async function syncSubscriptionStatus(subscription) {
  const statusMap = { active: "active", trialing: "active", past_due: "past_due" };
  const status = statusMap[subscription.status] || "canceled";
  const update = { subscriptionStatus: status };
  if (subscription.current_period_end) {
    update.planRenewalDate = new Date(subscription.current_period_end * 1000);
  }
  if (status === "active") {
    update.trialEndsAt = null;
  }
  if (status === "canceled") {
    update.plan = null;
    update.planRenewalDate = null;
  }
  await User.findOneAndUpdate(
    { stripeSubscriptionId: subscription.id },
    update,
  );
}

async function handleListingFeePaid(session) {
  const submissionId = session.metadata?.submissionId;
  if (!submissionId) return;

  const submission = await Submission.findById(submissionId);
  if (!submission || submission.paymentStatus === "paid") return;

  submission.status = "pending";
  submission.paymentStatus = "paid";
  submission.stripePaymentIntentId = session.payment_intent;
  await submission.save();

  await notificationService.create(submission.userId, {
    type: "system",
    title: "Listing fee received",
    body: "Your £10 listing fee was received — your submission has been added to our review queue.",
  });
}

export const billingService = {
  async initStripePrices() {
    if (!env.stripeSecretKey) {
      console.warn(
        "[billing] STRIPE_SECRET_KEY not set — billing endpoints will return 503 until configured.",
      );
      return;
    }

    const client = stripe();
    const config = PLAN_CONFIG.Premium;

    const products = await client.products.list({ limit: 100 });
    let product = products.data.find((p) => p.metadata?.plan === "Premium");
    if (!product) {
      product = await client.products.create({
        name: "PropertyReply Premium",
        metadata: { plan: "Premium" },
      });
    }

    const prices = await client.prices.list({
      product: product.id,
      active: true,
      limit: 100,
    });
    let price = prices.data.find(
      (p) =>
        p.unit_amount === config.priceGBP * 100 &&
        p.recurring?.interval === "month",
    );
    if (!price) {
      price = await client.prices.create({
        product: product.id,
        unit_amount: config.priceGBP * 100,
        currency: "gbp",
        recurring: { interval: "month" },
      });
    }
    premiumPriceId = price.id;

    try {
      await client.coupons.retrieve(INTRO_COUPON_ID);
    } catch {
      await client.coupons.create({
        id: INTRO_COUPON_ID,
        amount_off: Math.round((config.priceGBP - config.introPriceGBP) * 100),
        currency: "gbp",
        duration: "repeating",
        duration_in_months: config.introMonths,
        name: `First ${config.introMonths} months intro price`,
      });
    }

    console.log(`[billing] Stripe Premium plan ready (price ${premiumPriceId}).`);
  },

  async createCheckoutSession(user, plan) {
    if (!PLAN_CONFIG[plan]?.purchasable) {
      throw new ApiError(400, `The ${plan} plan is not available for purchase yet.`);
    }

    const client = stripe();
    const priceId = requirePremiumPrice();
    const customerId = await resolveStripeCustomerId(user);

    const session = await client.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      discounts: [{ coupon: INTRO_COUPON_ID }],
      customer: customerId || undefined,
      customer_email: customerId ? undefined : user.email,
      client_reference_id: user._id.toString(),
      metadata: { userId: user._id.toString(), plan },
      success_url: `${env.clientUrl}/app/membership?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.clientUrl}/app/membership?checkout=cancelled`,
    });

    return session.url;
  },

  async confirmCheckoutSession(user, sessionId) {
    const client = stripe();
    const session = await client.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription"],
    });

    // Listing-fee checkout — reconcile even if the billing webhook never arrived
    if (session.metadata?.purpose === "listing_fee") {
      if (session.metadata.userId !== user._id.toString()) {
        throw new ApiError(
          403,
          "This checkout session does not belong to your account.",
        );
      }

      if (
        session.status === "complete" ||
        session.payment_status === "paid"
      ) {
        await handleListingFeePaid(session);
      }

      const submission = await Submission.findById(
        session.metadata.submissionId,
      );
      return {
        purpose: "listing_fee",
        paymentStatus: submission?.paymentStatus || "pending",
        status: submission?.status || "awaiting_payment",
        plan: user.plan,
      };
    }

    if (session.client_reference_id !== user._id.toString()) {
      throw new ApiError(403, "This checkout session does not belong to your account.");
    }

    if (session.status === "complete") {
      await applySubscriptionToUser(user._id, session);
    }

    const refreshed = await User.findById(user._id);
    return {
      purpose: "subscription",
      plan: refreshed.plan,
      status: refreshed.subscriptionStatus,
    };
  },

  async createPortalSession(user) {
    const customerId = await resolveStripeCustomerId(user);
    if (!customerId) {
      throw new ApiError(400, "No billing account found. Subscribe to a plan first.");
    }
    const client = stripe();
    const session = await client.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${env.clientUrl}/app/membership`,
    });
    return session.url;
  },

  async startFreeTrial(user) {
    if (hasPaidSubscription(user) || isOnFreeTrial(user)) {
      throw new ApiError(400, "You already have an active plan or trial.");
    }
    if (!canStartFreeTrial(user)) {
      throw new ApiError(
        400,
        "Your free trial has already been used. Please subscribe to continue.",
      );
    }

    user.plan = "Premium";
    user.subscriptionStatus = "trialing";
    user.trialEndsAt = trialEndsAtFromNow(TRIAL_DAYS);
    await user.save();

    try {
      await notificationService.create(user._id, {
        type: "system",
        title: "Free trial started",
        body: `Your ${TRIAL_DAYS}-day Premium trial is active. Browse deals and prepare listings as drafts. Subscribe anytime to publish and keep access.`,
      });
    } catch {
      // non-critical
    }

    return user;
  },

  async createListingCheckout(user, submission) {
    const client = stripe();
    const customerId = await resolveStripeCustomerId(user);

    const session = await client.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "gbp",
            unit_amount: LISTING_FEE_GBP * 100,
            product_data: { name: "Property listing submission fee" },
          },
          quantity: 1,
        },
      ],
      customer: customerId || undefined,
      customer_email: customerId ? undefined : user.email,
      metadata: {
        purpose: "listing_fee",
        submissionId: submission._id.toString(),
        userId: user._id.toString(),
      },
      success_url: `${env.clientUrl}/app/submit?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.clientUrl}/app/submit?payment=cancelled&submissionId=${submission._id}`,
    });

    submission.stripeCheckoutSessionId = session.id;
    await submission.save();

    return session.url;
  },

  /** If Stripe already collected the fee but webhook never ran, mark paid. */
  async reconcileListingPayment(submission) {
    if (
      !submission ||
      submission.paymentStatus === "paid" ||
      submission.status !== "awaiting_payment" ||
      !submission.stripeCheckoutSessionId ||
      !env.stripeSecretKey
    ) {
      return submission;
    }

    try {
      const client = stripe();
      const session = await client.checkout.sessions.retrieve(
        submission.stripeCheckoutSessionId,
      );
      if (
        session.status === "complete" ||
        session.payment_status === "paid"
      ) {
        await handleListingFeePaid(session);
        return Submission.findById(submission._id);
      }
    } catch (err) {
      console.warn(
        "[billing] listing payment reconcile failed:",
        err?.message || err,
      );
    }

    return submission;
  },

  async createSaleCommissionInvoice(user, listing, salePrice) {
    const client = stripe();
    const commissionGBP =
      Math.round(salePrice * SALE_COMMISSION_RATE * 100) / 100;

    const customerId = await getOrCreateStripeCustomer(user);

    await client.invoiceItems.create({
      customer: customerId,
      amount: Math.round(commissionGBP * 100),
      currency: "gbp",
      description: `10% sale commission — "${listing.title}" sold for £${salePrice.toLocaleString("en-GB")}`,
    });

    const invoice = await client.invoices.create({
      customer: customerId,
      collection_method: "send_invoice",
      days_until_due: 14,
      auto_advance: true,
    });

    await client.invoices.sendInvoice(invoice.id);

    return { commissionGBP, stripeInvoiceId: invoice.id };
  },

  async handleWebhookEvent(rawBody, signature) {
    const client = stripe();
    const event = client.webhooks.constructEvent(
      rawBody,
      signature,
      env.stripeWebhookSecret,
    );

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        if (session.metadata?.purpose === "listing_fee") {
          await handleListingFeePaid(session);
        } else if (session.mode === "subscription") {
          const fullSession = await client.checkout.sessions.retrieve(session.id, {
            expand: ["subscription"],
          });
          const userId = session.metadata?.userId || session.client_reference_id;
          if (userId) await applySubscriptionToUser(userId, fullSession);
        }
        break;
      }
      case "customer.subscription.updated":
        await syncSubscriptionStatus(event.data.object);
        break;
      case "customer.subscription.deleted":
        await syncSubscriptionStatus({ ...event.data.object, status: "canceled" });
        break;
      case "invoice.paid": {
        const invoice = event.data.object;
        await Listing.findOneAndUpdate(
          { stripeInvoiceId: invoice.id },
          { commissionInvoiceStatus: "paid" },
        );
        break;
      }
      default:
        break;
    }
  },
};
