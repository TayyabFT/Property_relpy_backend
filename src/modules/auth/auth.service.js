import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";
import { ApiError } from "../../utils/ApiError.js";
import { User } from "./auth.model.js";
import { notificationService } from "../notifications/notification.service.js";
import { emailService } from "../../services/email.js";
import {
  generateSecureToken,
  hashToken,
  verificationExpiry,
  passwordResetExpiry,
} from "../../utils/tokens.js";
import {
  TRIAL_DAYS,
  expireTrialIfNeeded,
  expireCommercialIfNeeded,
  isOnFreeTrial,
  canStartFreeTrial,
  hasPaidSubscription,
  isCommercialPartner,
  listingFeeWaived,
} from "../../utils/planAccess.js";

function initialsFor(firstName, lastName) {
  const first = firstName?.trim()?.[0] || "";
  const last = lastName?.trim()?.[0] || "";
  const combined = (first + last).toUpperCase();
  return combined || "PR";
}

function formatUser(user) {
  const firstName = user.firstName;
  const lastName = user.lastName;
  const name = `${firstName} ${lastName}`.trim();
  const onTrial = isOnFreeTrial(user);
  const hasPaidPlan = hasPaidSubscription(user);
  const onCommercial = isCommercialPartner(user);

  return {
    id: user._id.toString(),
    firstName,
    lastName,
    name,
    email: user.email,
    plan: user.plan || null,
    subscriptionStatus: user.subscriptionStatus || "none",
    trialEndsAt: user.trialEndsAt || null,
    commercialPartnershipEndsAt: user.commercialPartnershipEndsAt || null,
    onTrial,
    onCommercial,
    listingFeeWaived: listingFeeWaived(user),
    hasPaidPlan,
    canStartTrial: canStartFreeTrial(user),
    role: user.role || "user",
    status: user.status || "active",
    kycStatus: user.kycStatus || "pending",
    isEmailVerified: Boolean(user.isEmailVerified),
    initials: initialsFor(firstName, lastName),
    phone: user.phone || "",
    location: user.location || "",
    investorType: user.investorType || "",
    notificationPrefs: user.notificationPrefs || [],
    createdAt: user.createdAt,
  };
}

async function refreshUserAccess(user) {
  let dirty = false;
  if (await expireTrialIfNeeded(user)) dirty = true;
  if (await expireCommercialIfNeeded(user)) dirty = true;
  if (dirty) await user.save();
  return user;
}

function signToken(userId) {
  return jwt.sign({ sub: userId }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
}

function buildVerificationLink(rawToken) {
  return `${env.clientUrl}/verify-email?token=${rawToken}`;
}

function buildResetLink(rawToken) {
  return `${env.clientUrl}/reset-password?token=${rawToken}`;
}

export const authService = {
  async register({ firstName, lastName, email, password }) {
    if (!firstName?.trim()) throw new ApiError(400, "First name is required");
    if (!lastName?.trim()) throw new ApiError(400, "Last name is required");
    if (!email?.trim()) throw new ApiError(400, "Email is required");
    if (!password || password.length < 8) {
      throw new ApiError(400, "Password must be at least 8 characters");
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      throw new ApiError(409, "An account with this email already exists");
    }

    const verificationRaw = generateSecureToken();

    const user = await User.create({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.toLowerCase().trim(),
      password,
      emailVerificationToken: hashToken(verificationRaw),
      emailVerificationExpires: verificationExpiry(),
      // Trial is started explicitly from the membership screen
      plan: null,
      subscriptionStatus: "none",
      trialEndsAt: null,
    });

    const verificationLink = buildVerificationLink(verificationRaw);

    emailService.queueEmail(
      () => emailService.sendWelcomeEmail(user.email, user.firstName, verificationLink),
      `welcome:${user.email}`,
    );
    emailService.queueEmail(
      () =>
        emailService.sendEmailVerification(
          user.email,
          user.firstName,
          verificationLink,
        ),
      `verify:${user.email}`,
    );

    await notificationService.create(user._id, {
      type: "welcome",
      title: "Welcome to PropertyReply",
      body: `Your account is ready. Start a ${TRIAL_DAYS}-day free Premium trial from Membership, or subscribe anytime. Publishing a listing requires membership plus a £10 fee.`,
    });

    const token = signToken(user._id);

    return {
      user: formatUser(user),
      token,
    };
  },

  async login({ email, password }) {
    if (!email?.trim()) throw new ApiError(400, "Email is required");
    if (!password) throw new ApiError(400, "Password is required");

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select(
      "+password",
    );

    if (!user) {
      throw new ApiError(401, "Invalid email or password");
    }

    if (user.status === "banned") {
      throw new ApiError(403, "This account has been banned. Contact support.");
    }
    if (user.status === "suspended") {
      throw new ApiError(403, "This account is suspended. Contact support.");
    }

    const valid = await user.comparePassword(password);
    if (!valid) {
      throw new ApiError(401, "Invalid email or password");
    }

    await refreshUserAccess(user);

    const token = signToken(user._id);

    return {
      user: formatUser(user),
      token,
    };
  },

  async forgotPassword({ email }) {
    if (!email?.trim()) throw new ApiError(400, "Email is required");

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select(
      "+passwordResetToken +passwordResetExpires",
    );

    if (user) {
      const resetRaw = generateSecureToken();
      user.passwordResetToken = hashToken(resetRaw);
      user.passwordResetExpires = passwordResetExpiry();
      await user.save();

      emailService.queueEmail(
        () =>
          emailService.sendPasswordReset(
            user.email,
            user.firstName,
            buildResetLink(resetRaw),
          ),
        `reset:${user.email}`,
      );
    }

    return {
      message:
        "If an account exists for that email, a password reset link has been sent.",
    };
  },

  async resetPassword({ token, newPassword }) {
    if (!token) throw new ApiError(400, "Reset token is required");
    if (!newPassword || newPassword.length < 8) {
      throw new ApiError(400, "Password must be at least 8 characters");
    }

    const user = await User.findOne({
      passwordResetToken: hashToken(token),
      passwordResetExpires: { $gt: new Date() },
    }).select("+password +passwordResetToken +passwordResetExpires");

    if (!user) {
      throw new ApiError(400, "Invalid or expired reset token");
    }

    user.password = newPassword;
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    await user.save();

    return { message: "Password updated successfully" };
  },

  async verifyEmail({ token }) {
    if (!token) throw new ApiError(400, "Verification token is required");

    const user = await User.findOne({
      emailVerificationToken: hashToken(token),
      emailVerificationExpires: { $gt: new Date() },
    }).select("+emailVerificationToken +emailVerificationExpires");

    if (!user) {
      throw new ApiError(400, "Invalid or expired verification link");
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;
    await user.save();

    return {
      message: "Email verified successfully",
      user: formatUser(user),
    };
  },

  async getProfile(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, "User not found");
    }
    await refreshUserAccess(user);
    return formatUser(user);
  },

  async updateProfile(userId, updates = {}) {
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    if (updates.firstName !== undefined) {
      if (!updates.firstName.trim()) throw new ApiError(400, "First name is required");
      user.firstName = updates.firstName.trim();
    }
    if (updates.lastName !== undefined) {
      if (!updates.lastName.trim()) throw new ApiError(400, "Last name is required");
      user.lastName = updates.lastName.trim();
    }
    if (updates.phone !== undefined) user.phone = updates.phone.trim();
    if (updates.location !== undefined) user.location = updates.location.trim();
    if (updates.investorType !== undefined) {
      user.investorType = updates.investorType.trim();
    }
    if (Array.isArray(updates.notificationPrefs)) {
      user.notificationPrefs = updates.notificationPrefs.filter(
        (item) => typeof item === "string",
      );
    }

    await user.save();
    return formatUser(user);
  },

  async changePassword(userId, { currentPassword, newPassword }) {
    if (!currentPassword) throw new ApiError(400, "Current password is required");
    if (!newPassword || newPassword.length < 8) {
      throw new ApiError(400, "New password must be at least 8 characters");
    }

    const user = await User.findById(userId).select("+password");
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    const valid = await user.comparePassword(currentPassword);
    if (!valid) {
      throw new ApiError(401, "Current password is incorrect");
    }

    user.password = newPassword;
    await user.save();
    return { updated: true };
  },
};

async function ensureAdminUser({ email, password, firstName, lastName }) {
  const normalizedEmail = String(email || "")
    .toLowerCase()
    .trim();
  if (!normalizedEmail || !password) return;

  const existing = await User.findOne({ email: normalizedEmail });

  if (existing) {
    const legacyKyc = {
      verified: "approved",
      failed: "rejected",
      unverified: "pending",
    };
    if (legacyKyc[existing.kycStatus]) {
      existing.kycStatus = legacyKyc[existing.kycStatus];
    }
    let needsSave = existing.isModified();
    if (existing.role !== "admin") {
      existing.role = "admin";
      existing.status = "active";
      needsSave = true;
    }
    if (existing.subscriptionStatus !== "active") {
      existing.subscriptionStatus = "active";
      needsSave = true;
    }
    if (needsSave) await existing.save();
    return;
  }

  await User.create({
    firstName: firstName || "Site",
    lastName: lastName || "Admin",
    email: normalizedEmail,
    password,
    role: "admin",
    status: "active",
    plan: "Ultra",
    subscriptionStatus: "active",
    kycStatus: "approved",
    isEmailVerified: true,
  });

  console.log(`Admin account ready: ${normalizedEmail}`);
}

export async function seedAdminUser() {
  const admins = [
    {
      email: env.adminEmail,
      password: env.adminPassword,
      firstName: env.adminFirstName,
      lastName: env.adminLastName,
    },
  ];

  // Optional second admin (does not replace the primary ADMIN_EMAIL account)
  if (env.admin2Email && env.admin2Password) {
    admins.push({
      email: env.admin2Email,
      password: env.admin2Password,
      firstName: env.admin2FirstName,
      lastName: env.admin2LastName,
    });
  }

  for (const admin of admins) {
    await ensureAdminUser(admin);
  }
}
