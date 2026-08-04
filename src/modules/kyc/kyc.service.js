import { User } from "../auth/auth.model.js";
import { ComplianceAudit } from "./complianceAudit.model.js";
import { stripeIdentityService } from "../../services/stripeIdentity.service.js";
import { emailService } from "../../services/email.js";
import { ApiError } from "../../utils/ApiError.js";

const STEP_LABELS = [
  "Create Account",
  "Email Verified",
  "ID Verification",
  "AML Check",
  "Verified",
];

const COMPLETED_STEPS = {
  pending: 2,
  in_progress: 3,
  consider: 4,
  approved: 5,
  rejected: 2,
};

function formatLongDate(date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

function addYears(date, years) {
  const next = new Date(date);
  next.setFullYear(next.getFullYear() + years);
  return next;
}

function buildSteps(status) {
  const completed = COMPLETED_STEPS[status] ?? 2;
  return STEP_LABELS.map((label, index) => {
    const stepNumber = index + 1;
    let state = "todo";
    if (stepNumber <= completed) state = "done";
    else if (stepNumber === completed + 1) state = "active";
    return {
      num: stepNumber <= completed ? "✓" : String(stepNumber),
      label,
      state,
    };
  });
}

function buildCompliance(status, user) {
  const approved = status === "approved";
  const ok = (passLabel, pendingLabel) =>
    approved ? passLabel : pendingLabel;

  const rows = [
    {
      label: "Identity Document (Passport / Driving Licence)",
      value: ok(
        "Verified",
        status === "rejected" ? "Failed" : "Not started",
      ),
      ok: approved,
    },
    {
      label: "Selfie / Liveness Check",
      value: ok(
        "Passed",
        status === "rejected" ? "Failed" : "Not started",
      ),
      ok: approved,
    },
    {
      label: "KYC — Know Your Customer",
      value: ok(
        "Completed",
        status === "in_progress" || status === "consider"
          ? "In Progress"
          : "Not started",
      ),
      ok: approved,
    },
    {
      label: "AML — Anti-Money Laundering Screening",
      value: ok(
        "Clear",
        status === "consider" ? "Review" : "Pending",
      ),
      ok: approved,
    },
    {
      label: "PEP & Sanctions Check",
      value: ok(
        "Clear",
        status === "consider" ? "Review" : "Pending",
      ),
      ok: approved,
    },
  ];

  if (approved) {
    const verifiedAt = user.kycVerifiedAt || user.updatedAt || new Date();
    rows.push({
      label: "Verification Date",
      value: formatLongDate(verifiedAt),
      mono: true,
    });
    rows.push({
      label: "Next Review Due",
      value: formatLongDate(addYears(verifiedAt, 1)),
      mono: true,
    });
    rows.push({
      label: "Reference",
      value:
        user.kycReference ||
        `PR-STRIPE-${user._id.toString().slice(-8).toUpperCase()}`,
      mono: true,
    });
  }

  return rows;
}

async function getUserOrThrow(userId) {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, "User not found");
  return user;
}

async function applyKycOutcome(user, { kycStatus, reference, result, eventType, rawPayload }) {
  // Avoid duplicate emails / audit spam if status already matches
  const alreadySame = user.kycStatus === kycStatus;

  user.kycStatus = kycStatus;
  user.kycReference = reference;
  if (kycStatus === "approved") {
    user.kycVerifiedAt = new Date();
  }
  await user.save();

  if (alreadySame) {
    return;
  }

  await ComplianceAudit.create({
    userId: user._id,
    provider: "stripe",
    reference,
    result: result || kycStatus,
    eventType,
    rawPayload,
    occurredAt: new Date(),
  });

  if (kycStatus === "approved" || kycStatus === "rejected") {
    emailService.queueEmail(
      () =>
        emailService.sendKYCStatus(
          user.email,
          user.firstName,
          kycStatus,
        ),
      `kyc-${kycStatus}:${user.email}`,
    );
  }
}

/**
 * Map a Stripe VerificationSession to our KYC status.
 * Only mark rejected after a real failed check (last_error + verification report),
 * not when the session was merely created and is waiting for the user.
 */
function mapSessionToKycStatus(session) {
  if (!session) return null;

  if (session.status === "verified") return "approved";
  if (session.status === "processing") return "in_progress";

  if (session.status === "canceled") {
    // Canceled ≠ failed document check — let the user start again
    return "pending";
  }

  if (session.status === "requires_input") {
    const hasFailedCheck =
      Boolean(session.last_error?.code) &&
      Boolean(session.last_verification_report);
    return hasFailedCheck ? "rejected" : "in_progress";
  }

  return null;
}

async function syncUserFromStripe(user) {
  if (
    !user.stripeIdentitySessionId ||
    user.kycStatus === "approved" ||
    stripeIdentityService.isStaticMode()
  ) {
    return user;
  }

  try {
    const session = await stripeIdentityService.retrieveSession(
      user.stripeIdentitySessionId,
    );
    const mapped = mapSessionToKycStatus(session);
    if (!mapped || mapped === user.kycStatus) {
      return user;
    }

    if (mapped === "approved" || mapped === "rejected") {
      await applyKycOutcome(user, {
        kycStatus: mapped,
        reference: session.id,
        result: session.last_error?.code || session.status,
        eventType: `sync.${session.status}`,
        rawPayload: { session },
      });
    } else {
      user.kycStatus = mapped;
      await user.save();
    }

    return user;
  } catch (err) {
    console.warn(
      "[kyc] Stripe session sync failed:",
      err?.message || err,
    );
    return user;
  }
}

async function findUserForSession(session) {
  const userId = session?.metadata?.userId;
  if (userId) {
    const byMeta = await User.findById(userId);
    if (byMeta) return byMeta;
  }
  if (session?.id) {
    return User.findOne({ stripeIdentitySessionId: session.id });
  }
  return null;
}

function statusPayload(user) {
  const status = user.kycStatus || "pending";
  return {
    status,
    verified: status === "approved",
    stripeIdentitySessionId: user.stripeIdentitySessionId || null,
    provider: "stripe",
    staticMode: stripeIdentityService.isStaticMode(),
    reference: user.kycReference || null,
    lastError: null,
    steps: buildSteps(status),
    compliance: buildCompliance(status, user),
  };
}

export const kycService = {
  async getStatus(userId) {
    let user = await getUserOrThrow(userId);
    user = await syncUserFromStripe(user);

    const payload = statusPayload(user);

    // Surface Stripe's failure reason when rejected (helps debugging)
    if (
      user.kycStatus === "rejected" &&
      user.stripeIdentitySessionId &&
      !stripeIdentityService.isStaticMode()
    ) {
      try {
        const session = await stripeIdentityService.retrieveSession(
          user.stripeIdentitySessionId,
        );
        if (session.last_error) {
          payload.lastError = {
            code: session.last_error.code || null,
            reason: session.last_error.reason || null,
          };
        }
      } catch {
        // ignore
      }
    }

    return payload;
  },

  /**
   * Creates a Stripe Identity VerificationSession and returns a hosted URL.
   * The frontend redirects the user to Stripe to complete document + selfie checks.
   */
  async startVerification(userId) {
    let user = await getUserOrThrow(userId);
    user = await syncUserFromStripe(user);

    if (user.kycStatus === "approved") {
      throw new ApiError(400, "Your identity is already verified");
    }

    // Resume an existing open session when possible
    if (
      (user.kycStatus === "in_progress" || user.kycStatus === "rejected") &&
      user.stripeIdentitySessionId
    ) {
      if (stripeIdentityService.isStaticMode()) {
        user.kycStatus = "in_progress";
        await user.save();
        return {
          sessionId: user.stripeIdentitySessionId,
          url: null,
          status: "invited",
          provider: "stripe",
          staticMode: true,
          message:
            "Static demo mode — no real Stripe Identity session was created. An admin can approve this manually.",
        };
      }

      try {
        const existing = await stripeIdentityService.retrieveSession(
          user.stripeIdentitySessionId,
        );

        if (existing.status === "verified") {
          await applyKycOutcome(user, {
            kycStatus: "approved",
            reference: existing.id,
            result: "verified",
            eventType: "identity.verification_session.verified",
            rawPayload: { session: existing },
          });
          return {
            sessionId: existing.id,
            url: null,
            status: "verified",
            provider: "stripe",
            staticMode: false,
            message: "Your identity has already been verified.",
          };
        }

        if (existing.status === "processing") {
          user.kycStatus = "in_progress";
          await user.save();
          return {
            sessionId: existing.id,
            url: null,
            status: "processing",
            provider: "stripe",
            staticMode: false,
            message:
              "Your verification is still being processed. This page will update automatically.",
          };
        }

        // Still open for user input (including after a failed attempt that can be retried)
        if (existing.status === "requires_input" && existing.url) {
          user.kycStatus = "in_progress";
          await user.save();
          return {
            sessionId: existing.id,
            url: existing.url,
            status: "requires_input",
            provider: "stripe",
            staticMode: false,
            message:
              "Continue your identity verification on the secure Stripe page.",
          };
        }
      } catch {
        // Session may be expired/redacted — create a fresh one below
      }
    }

    const result = await stripeIdentityService.createVerificationSession({
      userId: user._id.toString(),
      email: user.email,
    });

    user.stripeIdentitySessionId = result.sessionId;
    user.kycStatus = "in_progress";
    await user.save();

    return {
      sessionId: result.sessionId,
      url: result.url,
      status: "invited",
      provider: "stripe",
      staticMode: stripeIdentityService.isStaticMode(),
      message: stripeIdentityService.isStaticMode()
        ? "Static demo mode — no real Stripe Identity session was created. An admin can approve this manually."
        : "Redirecting you to Stripe to complete your identity verification.",
    };
  },

  async handleWebhook(rawBody, signature) {
    const event = stripeIdentityService.constructWebhookEvent(
      rawBody,
      signature,
    );

    const type = event.type;
    const session = event.data?.object;

    if (!session?.id) {
      return { handled: false, reason: "missing_session" };
    }

    if (
      type !== "identity.verification_session.verified" &&
      type !== "identity.verification_session.requires_input" &&
      type !== "identity.verification_session.canceled" &&
      type !== "identity.verification_session.processing"
    ) {
      return { handled: false, reason: "ignored_event_type", type };
    }

    const user = await findUserForSession(session);
    if (!user) {
      return { handled: false, reason: "user_not_found" };
    }

    // Always prefer live session object mapping
    const mapped = mapSessionToKycStatus(session);

    if (type === "identity.verification_session.processing" || mapped === "in_progress") {
      user.stripeIdentitySessionId = session.id;
      user.kycStatus = "in_progress";
      await user.save();
      return {
        handled: true,
        userId: user._id.toString(),
        kycStatus: "in_progress",
        provider: "stripe",
      };
    }

    if (mapped === "pending") {
      user.kycStatus = "pending";
      await user.save();
      return {
        handled: true,
        userId: user._id.toString(),
        kycStatus: "pending",
        provider: "stripe",
      };
    }

    if (mapped === "approved" || mapped === "rejected") {
      await applyKycOutcome(user, {
        kycStatus: mapped,
        reference: session.id,
        result: session.last_error?.code || session.status || mapped,
        eventType: type,
        rawPayload: event,
      });
      return {
        handled: true,
        userId: user._id.toString(),
        kycStatus: mapped,
        provider: "stripe",
      };
    }

    return { handled: false, reason: "unmapped_status", status: session.status };
  },
};
