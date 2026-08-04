import crypto from "crypto";
import Stripe from "stripe";
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";

let stripeClient = null;

function stripe() {
  if (!env.stripeSecretKey) {
    throw new ApiError(
      503,
      "Stripe Identity is not configured. Set STRIPE_SECRET_KEY.",
    );
  }
  if (!stripeClient) {
    stripeClient = new Stripe(env.stripeSecretKey);
  }
  return stripeClient;
}

function isStaticMode() {
  return env.stripeIdentityStaticMode || !env.stripeSecretKey;
}

function generateId(prefix) {
  return `${prefix}-${crypto.randomBytes(12).toString("hex")}`;
}

function returnUrl() {
  const base = (env.clientUrl || "http://localhost:3000").replace(/\/$/, "");
  return `${base}/app/kyc?stripe_return=1`;
}

export const stripeIdentityService = {
  isStaticMode,

  /**
   * Creates a Stripe Identity VerificationSession and returns the hosted URL.
   * User completes document + selfie checks on Stripe's hosted page, then
   * returns to CLIENT_URL/app/kyc. Final status arrives via webhook.
   */
  async createVerificationSession({ userId, email }) {
    if (isStaticMode()) {
      return {
        sessionId: generateId("vs"),
        url: null,
        clientSecret: null,
        mode: "static",
      };
    }

    const client = stripe();
    const session = await client.identity.verificationSessions.create({
      type: "document",
      options: {
        document: {
          require_matching_selfie: true,
        },
      },
      provided_details: {
        email,
      },
      metadata: {
        userId: String(userId),
      },
      return_url: returnUrl(),
    });

    if (!session?.id || !session?.url) {
      throw new ApiError(
        502,
        "Stripe Identity did not return a verification session URL.",
      );
    }

    return {
      sessionId: session.id,
      url: session.url,
      clientSecret: session.client_secret || null,
      mode: "live",
    };
  },

  async retrieveSession(sessionId) {
    if (isStaticMode()) {
      return {
        id: sessionId,
        status: "requires_input",
        url: null,
        last_error: null,
        mode: "static",
      };
    }

    const client = stripe();
    return client.identity.verificationSessions.retrieve(sessionId);
  },

  /**
   * Verifies Stripe webhook signature for the KYC Identity endpoint.
   * Prefers STRIPE_IDENTITY_WEBHOOK_SECRET, falls back to STRIPE_WEBHOOK_SECRET.
   */
  constructWebhookEvent(rawBody, signature) {
    if (isStaticMode()) {
      const payload =
        typeof rawBody === "string"
          ? JSON.parse(rawBody)
          : Buffer.isBuffer(rawBody)
            ? JSON.parse(rawBody.toString("utf8"))
            : rawBody;
      return payload;
    }

    const secret =
      env.stripeIdentityWebhookSecret || env.stripeWebhookSecret;
    if (!secret) {
      throw new ApiError(
        503,
        "STRIPE_IDENTITY_WEBHOOK_SECRET (or STRIPE_WEBHOOK_SECRET) is not configured",
      );
    }
    if (!signature) {
      throw new ApiError(401, "Missing Stripe-Signature header");
    }

    const client = stripe();
    try {
      return client.webhooks.constructEvent(rawBody, signature, secret);
    } catch (err) {
      throw new ApiError(401, `Invalid Stripe webhook signature: ${err.message}`);
    }
  },
};
