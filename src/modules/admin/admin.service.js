import { ApiError } from "../../utils/ApiError.js";
import { User } from "../auth/auth.model.js";
import { Listing } from "../listings/listing.model.js";
import { Submission } from "../overview/submission.model.js";
import { DealAnalysisReport } from "../dealAnalysis/dealAnalysisReport.model.js";
import { DealAnalysis } from "../dealAnalysis/dealAnalysis.model.js";
import { buildAnalysisPayload } from "../dealAnalysis/dealAnalysis.factory.js";
import { notificationService } from "../notifications/notification.service.js";
import { emailService } from "../../services/email.js";
import { env } from "../../config/env.js";
import { notifyNewListingPublished } from "../../jobs/emailJobs.js";
import { billingService } from "../billing/billing.service.js";
import { PLAN_CONFIG } from "../../config/plans.js";
import { CommercialInvite } from "../billing/commercialInvite.model.js";
import {
  commercialEndsAtFromNow,
  isCommercialPartner,
} from "../../utils/planAccess.js";
import { COMMERCIAL_TERM_MONTHS } from "../../config/plans.js";

const PLAN_PRICES = {
  Premium: PLAN_CONFIG.Premium.priceGBP,
  VIP: PLAN_CONFIG.VIP.priceGBP,
  Ultra: PLAN_CONFIG.Ultra.priceGBP,
};

const PROPERTY_TYPE_MAP = {
  "House – Terraced": "House",
  "House – Semi-Detached": "House",
  "House – Detached": "Detached",
  "Flat / Apartment": "Flat",
  Bungalow: "Bungalow",
  HMO: "HMO",
  Commercial: "Commercial",
  Land: "Land",
  "Mixed Use": "Commercial",
};

function mapPropertyType(value) {
  return PROPERTY_TYPE_MAP[value] || "House";
}

function parseBedrooms(value) {
  if (!value) return 0;
  if (value.toLowerCase().includes("studio")) return 0;
  const num = parseInt(value, 10);
  return Number.isNaN(num) ? 0 : num;
}

function formatGbp(amount) {
  return `£${Number(amount || 0).toLocaleString("en-GB")}`;
}

function formatCompactGbp(amount) {
  const value = Number(amount || 0);
  if (value >= 1_000_000) return `£${(value / 1_000_000).toFixed(1)}m`;
  if (value >= 1_000) return `£${Math.round(value / 1_000)}k`;
  return `£${value}`;
}

function formatShortDate(date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
  }).format(new Date(date));
}

function formatMonthYear(date) {
  return new Intl.DateTimeFormat("en-GB", {
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

function kycMeta(status) {
  switch (status) {
    case "approved":
      return { label: "✓ Approved", badge: "badge-green" };
    case "in_progress":
      return { label: "⏳ In Progress", badge: "badge-amber" };
    case "consider":
      return { label: "⚠ Review", badge: "badge-amber" };
    case "rejected":
      return { label: "✗ Rejected", badge: "badge-red" };
    case "pending":
    default:
      return { label: "○ Pending", badge: "badge-red" };
  }
}

function userStatusMeta(status) {
  switch (status) {
    case "active":
      return { label: "Active", color: "var(--green)" };
    case "suspended":
      return { label: "Suspended", color: "var(--amber)" };
    case "banned":
      return { label: "Banned", color: "var(--red)" };
    default:
      return { label: status, color: "var(--slate)" };
  }
}

function buildTagsFromSubmission(submission) {
  const tags = [];
  (submission.strategies || []).slice(0, 2).forEach((strategy) => {
    const short = strategy.split(" ")[0];
    tags.push({ label: short, badge: "badge-green" });
  });
  const beds = parseBedrooms(submission.bedrooms);
  if (beds > 0) tags.push({ label: `🛏 ${beds} bed` });
  return tags;
}

export const adminService = {
  async getStats() {
    const [
      totalUsers,
      activeListings,
      premiumMembers,
      vipMembers,
      ultraMembers,
      pendingSubmissions,
      openReports,
      activeUsers,
    ] = await Promise.all([
      User.countDocuments({ role: { $ne: "admin" } }),
      Listing.countDocuments({ status: "live" }),
      User.countDocuments({ plan: "Premium", role: { $ne: "admin" } }),
      User.countDocuments({ plan: "VIP", role: { $ne: "admin" } }),
      User.countDocuments({ plan: "Ultra", role: { $ne: "admin" } }),
      Submission.countDocuments({ status: "pending" }),
      DealAnalysisReport.countDocuments({ status: "pending" }),
      User.countDocuments({
        role: { $ne: "admin" },
        status: { $nin: ["banned", "suspended"] },
      }),
    ]);

    const monthlyRevenue =
      premiumMembers * PLAN_PRICES.Premium +
      vipMembers * PLAN_PRICES.VIP +
      ultraMembers * PLAN_PRICES.Ultra;

    return {
      cards: [
        {
          label: "Total Users",
          value: totalUsers.toLocaleString("en-GB"),
          sub: `${activeUsers.toLocaleString("en-GB")} active`,
        },
        {
          label: "Active Listings",
          value: activeListings.toLocaleString("en-GB"),
          sub: `${pendingSubmissions} pending review`,
        },
        {
          label: "Subscribed Members",
          value: (premiumMembers + vipMembers + ultraMembers).toLocaleString("en-GB"),
          sub: `${vipMembers + ultraMembers} on higher tiers`,
        },
        {
          label: "Monthly Revenue",
          value: formatGbp(monthlyRevenue),
          valueClass: "gold",
          sub: "Est. from active plans",
        },
      ],
      chips: {
        pendingListings: pendingSubmissions,
        openReports,
        activeUsers,
      },
    };
  },

  async getSubmissionQueue(status = "pending") {
    const filter =
      status === "all"
        ? { status: { $nin: ["draft", "awaiting_payment"] } }
        : { status };
    const submissions = await Submission.find(filter)
      .sort({ submittedAt: -1 })
      .populate({ path: "userId", select: "firstName lastName email kycStatus" });

    return submissions.map((s) => {
      const submitter = s.userId;
      const kyc = kycMeta(submitter?.kycStatus || "pending");
      return {
        id: s._id.toString(),
        property: s.property || "Untitled",
        location: s.location,
        submittedBy: submitter
          ? `${submitter.firstName} ${submitter.lastName}`.trim()
          : s.contact?.name || "Unknown",
        submitterEmail: submitter?.email || s.contact?.email || "",
        price: formatCompactGbp(s.askingPrice),
        discount: `${s.discountPercent}%`,
        submitted: formatShortDate(s.submittedAt),
        kycLabel: kyc.label,
        kycBadge: kyc.badge,
        status: s.status,
      };
    });
  },

  async approveSubmission(submissionId) {
    const submission = await Submission.findById(submissionId).populate({
      path: "userId",
      select: "firstName lastName email kycStatus",
    });
    if (!submission) throw new ApiError(404, "Submission not found");
    if (submission.status === "draft") {
      throw new ApiError(400, "Drafts cannot be approved");
    }
    if (submission.status === "live") {
      throw new ApiError(400, "Submission is already live");
    }

    const listing = await Listing.create({
      title: submission.property,
      location: submission.location || submission.town,
      locationSearch: [
        submission.town,
        submission.county,
        submission.postcode,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase(),
      postcode: submission.postcode,
      propertyType: mapPropertyType(submission.propertyType),
      bedrooms: parseBedrooms(submission.bedrooms),
      askingPrice: submission.askingPrice,
      marketValue: submission.marketValue,
      discountPercent: submission.discountPercent,
      strategies: submission.strategies,
      tags: buildTagsFromSubmission(submission),
      images: submission.images,
      description: submission.description,
      sellerName: submission.contact?.name || "",
      submittedBy: submission.userId?._id || submission.userId,
      sourceSubmissionId: submission._id,
      isTrialListing: Boolean(submission.isTrialListing),
      accessTier: "Premium",
      status: "live",
      publishedAt: new Date(),
    });

    submission.status = "live";
    await submission.save();

    const submitterId = submission.userId?._id || submission.userId;
    const submitterKyc = submission.userId?.kycStatus === "approved";
    await DealAnalysis.create(
      buildAnalysisPayload(listing, {
        contact: submission.contact,
        description: submission.description,
        address: [submission.streetAddress, submission.town, submission.postcode]
          .filter(Boolean)
          .join(", ") || submission.location,
        sellerKycPassed: submitterKyc,
      }),
    );

    await notificationService.create(submitterId, {
      type: "approved",
      title: "Your Listing Has Been Approved",
      body: `Your submission "${submission.property}" has been reviewed and is now live on the marketplace.`,
    });

    const submitter = submission.userId;
    if (submitter?.email) {
      const listingUrl = `${env.clientUrl}/app/listings/${listing._id}`;
      emailService.queueEmail(
        () =>
          emailService.sendListingApproved(
            submitter.email,
            submitter.firstName,
            submission.property,
            listingUrl,
          ),
        `listing-approved:${submitter.email}`,
      );
    }

    emailService.queueEmail(
      () => notifyNewListingPublished(listing),
      `new-deal-alerts:${listing._id}`,
    );

    return {
      submissionId: submission._id.toString(),
      listingId: listing._id.toString(),
      status: "live",
    };
  },

  async rejectSubmission(submissionId, reason) {
    const submission = await Submission.findById(submissionId).populate({
      path: "userId",
      select: "firstName lastName email",
    });
    if (!submission) throw new ApiError(404, "Submission not found");
    if (submission.status === "draft") {
      throw new ApiError(400, "Drafts cannot be rejected");
    }

    const rejectionReason =
      reason?.trim() ||
      "Your listing did not meet our quality guidelines. Please review and resubmit.";

    submission.status = "rejected";
    await submission.save();

    await notificationService.create(submission.userId, {
      type: "rejected",
      title: "Listing Update — Submission Rejected",
      body: `Your submission "${submission.property}" was not approved. ${rejectionReason}`,
    });

    const submitter = submission.userId;
    if (submitter?.email) {
      emailService.queueEmail(
        () =>
          emailService.sendListingRejected(
            submitter.email,
            submitter.firstName,
            submission.property,
            rejectionReason,
          ),
        `listing-rejected:${submitter.email}`,
      );
    }

    return { submissionId: submission._id.toString(), status: "rejected" };
  },

  async getUsers({ search = "", plan = "", status = "" } = {}) {
    const filter = { role: { $ne: "admin" } };

    if (search.trim()) {
      const term = search.trim();
      filter.$or = [
        { firstName: { $regex: term, $options: "i" } },
        { lastName: { $regex: term, $options: "i" } },
        { email: { $regex: term, $options: "i" } },
      ];
    }
    if (plan) filter.plan = plan;
    if (status) filter.status = status;

    const users = await User.find(filter).sort({ createdAt: -1 }).limit(100);

    return users.map((u) => {
      const kyc = kycMeta(u.kycStatus);
      const statusMeta = userStatusMeta(u.status);
      return {
        id: u._id.toString(),
        name: `${u.firstName} ${u.lastName}`.trim(),
        email: u.email,
        plan: u.plan,
        planBadge:
          u.plan === "VIP"
            ? "badge-amber"
            : u.plan === "Premium"
              ? "badge-green"
              : "",
        kycLabel: kyc.label,
        kycBadge: kyc.badge,
        kycStatus: u.kycStatus,
        joined: formatMonthYear(u.createdAt),
        status: u.status,
        statusLabel: statusMeta.label,
        statusColor: statusMeta.color,
      };
    });
  },

  async updateUser(userId, updates) {
    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, "User not found");
    if (user.role === "admin") {
      throw new ApiError(400, "Admin accounts cannot be modified here");
    }

    const allowedPlans = ["Premium", "VIP", "Ultra", "Commercial"];
    const allowedStatuses = ["active", "suspended", "banned"];
    const allowedKyc = [
      "pending",
      "in_progress",
      "approved",
      "rejected",
      "consider",
    ];

    if (updates.plan !== undefined) {
      if (!allowedPlans.includes(updates.plan)) {
        throw new ApiError(400, "Invalid plan");
      }
      user.plan = updates.plan;
      user.subscriptionStatus = "active";
      user.trialEndsAt = null;
      if (updates.plan === "Commercial") {
        user.commercialPartnershipEndsAt = commercialEndsAtFromNow(
          COMMERCIAL_TERM_MONTHS,
        );
        const renewal = new Date();
        renewal.setMonth(renewal.getMonth() + 1);
        user.planRenewalDate = renewal;
      } else {
        user.commercialPartnershipEndsAt = null;
        user.commercialInviteCode = "";
        const renewal = new Date();
        renewal.setDate(renewal.getDate() + 30);
        user.planRenewalDate = renewal;
      }
    }
    if (updates.status !== undefined) {
      if (!allowedStatuses.includes(updates.status)) {
        throw new ApiError(400, "Invalid status");
      }
      user.status = updates.status;
    }
    if (updates.kycStatus !== undefined) {
      if (!allowedKyc.includes(updates.kycStatus)) {
        throw new ApiError(400, "Invalid KYC status");
      }
      user.kycStatus = updates.kycStatus;
      if (updates.kycStatus === "approved") {
        user.kycVerifiedAt = user.kycVerifiedAt || new Date();
      }
    }

    await user.save();

    const [updated] = await this.getUsers({ search: user.email });
    return updated;
  },

  async deleteUser(userId) {
    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, "User not found");
    if (user.role === "admin") {
      throw new ApiError(400, "Admin accounts cannot be deleted");
    }
    await user.deleteOne();
    return { deleted: true };
  },

  async listAdmins() {
    const admins = await User.find({ role: "admin" })
      .sort({ createdAt: 1 })
      .limit(100);

    return admins.map((u) => ({
      id: u._id.toString(),
      name: `${u.firstName} ${u.lastName}`.trim(),
      email: u.email,
      status: u.status,
      joined: formatMonthYear(u.createdAt),
    }));
  },

  async createAdmin({ email, password, firstName, lastName } = {}) {
    const normalizedEmail = String(email || "")
      .toLowerCase()
      .trim();
    const trimmedPassword = String(password || "");
    const first = String(firstName || "Site").trim() || "Site";
    const last = String(lastName || "Admin").trim() || "Admin";

    if (!normalizedEmail) {
      throw new ApiError(400, "Email is required");
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      throw new ApiError(400, "Enter a valid email address");
    }
    if (trimmedPassword.length < 8) {
      throw new ApiError(400, "Password must be at least 8 characters");
    }

    const existing = await User.findOne({ email: normalizedEmail });

    if (existing) {
      if (existing.role === "admin") {
        throw new ApiError(400, "This email is already an admin account");
      }

      existing.role = "admin";
      existing.status = "active";
      existing.password = trimmedPassword;
      existing.firstName = first;
      existing.lastName = last;
      existing.isEmailVerified = true;
      existing.kycStatus = "approved";
      existing.plan = existing.plan || "Ultra";
      existing.subscriptionStatus = "active";
      await existing.save();

      return {
        id: existing._id.toString(),
        name: `${existing.firstName} ${existing.lastName}`.trim(),
        email: existing.email,
        status: existing.status,
        joined: formatMonthYear(existing.createdAt),
        promoted: true,
      };
    }

    const user = await User.create({
      firstName: first,
      lastName: last,
      email: normalizedEmail,
      password: trimmedPassword,
      role: "admin",
      status: "active",
      plan: "Ultra",
      subscriptionStatus: "active",
      kycStatus: "approved",
      isEmailVerified: true,
    });

    return {
      id: user._id.toString(),
      name: `${user.firstName} ${user.lastName}`.trim(),
      email: user.email,
      status: user.status,
      joined: formatMonthYear(user.createdAt),
      promoted: false,
    };
  },

  async getReports() {
    const reports = await DealAnalysisReport.find({ status: "pending" })
      .sort({ createdAt: -1 })
      .populate({ path: "listingId", select: "title location sellerName" })
      .populate({ path: "userId", select: "firstName lastName" });

    return reports.map((r) => ({
      id: r._id.toString(),
      listingId: r.listingId?._id?.toString() || null,
      title: r.listingId?.title || "Listing removed",
      location: r.listingId?.location || "",
      reason: r.reason,
      details: r.details,
      reportedBy: r.userId
        ? `${r.userId.firstName} ${r.userId.lastName}`.trim()
        : "Unknown",
      submittedBy: r.listingId?.sellerName || "Unknown",
      createdAt: r.createdAt,
    }));
  },

  async resolveReport(reportId) {
    const report = await DealAnalysisReport.findById(reportId);
    if (!report) throw new ApiError(404, "Report not found");
    report.status = "resolved";
    await report.save();
    return { id: report._id.toString(), status: "resolved" };
  },

  async removeListing(listingId) {
    const listing = await Listing.findById(listingId);
    if (!listing) throw new ApiError(404, "Listing not found");
    listing.status = "archived";
    await listing.save();

    await DealAnalysisReport.updateMany(
      { listingId, status: "pending" },
      { status: "resolved" },
    );

    return { listingId: listing._id.toString(), status: "archived" };
  },

  async toggleFeatured(listingId) {
    const listing = await Listing.findById(listingId);
    if (!listing) throw new ApiError(404, "Listing not found");
    listing.featured = !listing.featured;
    await listing.save();
    return { listingId: listing._id.toString(), featured: listing.featured };
  },

  async getLiveListings() {
    const listings = await Listing.find({ status: { $in: ["live", "sold"] } })
      .sort({ publishedAt: -1 })
      .limit(100);

    return listings.map((listing) => ({
      id: listing._id.toString(),
      title: listing.title,
      location: listing.location,
      askingPrice: formatGbp(listing.askingPrice),
      status: listing.status,
      salePrice: listing.salePrice ? formatGbp(listing.salePrice) : null,
      commissionGBP: listing.commissionGBP ? formatGbp(listing.commissionGBP) : null,
      commissionInvoiceStatus: listing.commissionInvoiceStatus,
    }));
  },

  async markListingSold(listingId, salePrice, partnerFeeGBP) {
    const listing = await Listing.findById(listingId);
    if (!listing) throw new ApiError(404, "Listing not found");
    if (listing.status === "sold") {
      throw new ApiError(400, "Listing is already marked as sold");
    }

    const price = Number(salePrice);
    if (!price || price <= 0) {
      throw new ApiError(400, "A valid sale price is required");
    }

    if (!listing.submittedBy) {
      throw new ApiError(
        400,
        "This listing has no linked seller account, so a commission invoice cannot be created.",
      );
    }

    const seller = await User.findById(listing.submittedBy);
    if (!seller) throw new ApiError(404, "Seller account not found");

    const commercial = isCommercialPartner(seller);
    let feeBasis = price;
    let basisLabel = "sale price";

    if (commercial) {
      const partnerFee = Number(partnerFeeGBP);
      if (!partnerFee || partnerFee <= 0) {
        throw new ApiError(
          400,
          "Enter the partner fee/remuneration received — Founders Club success fee is 5% of that amount.",
        );
      }
      feeBasis = partnerFee;
      basisLabel = "partner fee received";
    }

    const { commissionGBP, stripeInvoiceId, rate } =
      await billingService.createSaleCommissionInvoice(seller, listing, feeBasis, {
        basisLabel,
      });

    listing.status = "sold";
    listing.salePrice = price;
    listing.soldAt = new Date();
    listing.commissionGBP = commissionGBP;
    listing.stripeInvoiceId = stripeInvoiceId;
    listing.commissionInvoiceStatus = "invoiced";
    await listing.save();

    const pct = Math.round((rate || 0.1) * 100);
    await notificationService.create(seller._id, {
      type: "system",
      title: "Your listing sold — success fee invoice sent",
      body: `"${listing.title}" was marked as sold for ${formatGbp(price)}. A ${pct}% success fee invoice (${formatGbp(commissionGBP)}) has been emailed to you.`,
    });

    return {
      listingId: listing._id.toString(),
      status: "sold",
      salePrice: price,
      commissionGBP,
      rate,
      commercial,
    };
  },

  async createCommercialInvite(
    adminId,
    { email = "", note = "", daysValid = 30 } = {},
  ) {
    const code = CommercialInvite.generateCode();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (Number(daysValid) || 30));

    const invite = await CommercialInvite.create({
      code,
      email: email ? String(email).toLowerCase().trim() : "",
      note: String(note || "").trim(),
      createdBy: adminId,
      expiresAt,
      status: "active",
    });

    return {
      id: invite._id.toString(),
      code: invite.code,
      email: invite.email || null,
      note: invite.note,
      expiresAt: invite.expiresAt,
      status: invite.status,
      inviteUrl: `${env.clientUrl}/app/membership?invite=${invite.code}`,
    };
  },

  async listCommercialInvites() {
    const invites = await CommercialInvite.find()
      .sort({ createdAt: -1 })
      .limit(100)
      .populate({ path: "usedBy", select: "firstName lastName email" })
      .populate({ path: "createdBy", select: "firstName lastName email" });

    return invites.map((i) => ({
      id: i._id.toString(),
      code: i.code,
      email: i.email || null,
      note: i.note,
      status: i.status,
      expiresAt: i.expiresAt,
      usedAt: i.usedAt,
      usedBy: i.usedBy
        ? `${i.usedBy.firstName} ${i.usedBy.lastName}`.trim()
        : null,
      usedByEmail: i.usedBy?.email || null,
      createdBy: i.createdBy
        ? `${i.createdBy.firstName} ${i.createdBy.lastName}`.trim()
        : null,
      inviteUrl: `${env.clientUrl}/app/membership?invite=${i.code}`,
      createdAt: i.createdAt,
    }));
  },

  async revokeCommercialInvite(inviteId) {
    const invite = await CommercialInvite.findById(inviteId);
    if (!invite) throw new ApiError(404, "Invite not found");
    if (invite.status === "used") {
      throw new ApiError(400, "This invite has already been used");
    }
    invite.status = "revoked";
    await invite.save();
    return { id: invite._id.toString(), status: "revoked" };
  },

  async grantCommercialPartnership(userId, { months } = {}) {
    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, "User not found");
    if (user.role === "admin") {
      throw new ApiError(400, "Cannot grant partnership to an admin account");
    }

    const term = Number(months) || COMMERCIAL_TERM_MONTHS;
    user.plan = "Commercial";
    user.subscriptionStatus = "active";
    user.trialEndsAt = null;
    user.commercialPartnershipEndsAt = commercialEndsAtFromNow(term);
    const renewal = new Date();
    renewal.setMonth(renewal.getMonth() + 1);
    user.planRenewalDate = renewal;
    await user.save();

    try {
      await notificationService.create(user._id, {
        type: "system",
        title: "Founders Club activated",
        body: `Your Commercial Partnership (Founders Club) is active for ${term} months: £25/mo terms, no listing fees, 5% success fee on deals.`,
      });
    } catch {
      // non-critical
    }

    const [updated] = await this.getUsers({ search: user.email });
    return {
      ...(updated || {
        id: user._id.toString(),
        name: `${user.firstName} ${user.lastName}`.trim(),
        email: user.email,
      }),
      plan: "Commercial",
      commercialPartnershipEndsAt: user.commercialPartnershipEndsAt,
    };
  },
};
