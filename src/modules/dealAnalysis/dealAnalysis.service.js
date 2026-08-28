import { ApiError } from "../../utils/ApiError.js";
import { emailService } from "../../services/email.js";
import { User } from "../auth/auth.model.js";
import { Listing } from "../listings/listing.model.js";
import { ListingSave } from "../listings/listingSave.model.js";
import { listingsService } from "../listings/listings.service.js";
import { notificationService } from "../notifications/notification.service.js";
import { DealAnalysis } from "./dealAnalysis.model.js";
import { DealAnalysisReport } from "./dealAnalysisReport.model.js";
import { DealEnquiry } from "./dealEnquiry.model.js";
import { buildAnalysisPayload } from "./dealAnalysis.factory.js";
import {
  enquiriesService,
  inboxUrl,
} from "../enquiries/enquiries.service.js";

const PLAN_RANK = { Premium: 1, Commercial: 1, VIP: 2, Ultra: 3 };

const REPORT_REASONS = [
  { value: "misleading", label: "Misleading information" },
  { value: "spam", label: "Spam or scam" },
  { value: "duplicate", label: "Duplicate listing" },
  { value: "inaccurate", label: "Inaccurate pricing or data" },
  { value: "other", label: "Other" },
];

function formatGbp(amount) {
  return `£${amount.toLocaleString("en-GB")}`;
}

function formatGbpMonthly(amount) {
  return `£${amount.toLocaleString("en-GB")}/mo`;
}

function formatGbpNegative(amount) {
  return `- ${formatGbp(amount)}`;
}

function formatGbpNegativeMonthly(amount) {
  return `- ${formatGbpMonthly(amount)}`;
}

function maskPhone(phone) {
  if (!phone) return "•••• ••• ••••";
  return phone.replace(/\d(?=\d{3})/g, "•");
}

function maskEmail(email) {
  if (!email || !email.includes("@")) return "••••@••••.co.uk";
  const [local, domain] = email.split("@");
  return `${local.slice(0, 2)}••••@${domain[0]}••••.co.uk`;
}

function hasFullAnalysisAccess(plan) {
  return PLAN_RANK[plan] >= PLAN_RANK.Premium;
}

function hasContactAccess(plan) {
  return PLAN_RANK[plan] >= PLAN_RANK.Premium;
}

async function getUserPlan(userId) {
  const user = await User.findById(userId).select("plan");
  return user?.plan || null;
}

function buildFlipRows(listing, analysis) {
  const purchasePrice = listing.askingPrice;
  const totalInvestment =
    purchasePrice +
    analysis.stampDuty +
    analysis.refurbishment +
    analysis.legalFinanceCosts;
  const grossProfit = analysis.estimatedSalePrice - totalInvestment;

  return {
    rows: [
      { label: "Purchase Price", value: formatGbp(purchasePrice) },
      {
        label: "Stamp Duty",
        value: formatGbpNegative(analysis.stampDuty),
        valueClass: "neg",
      },
      {
        label: "Refurbishment (est.)",
        value: formatGbpNegative(analysis.refurbishment),
        valueClass: "neg",
      },
      {
        label: "Legal & Finance Costs",
        value: formatGbpNegative(analysis.legalFinanceCosts),
        valueClass: "neg",
      },
      { label: "Total Investment", value: formatGbp(totalInvestment) },
      {
        label: "Estimated Sale Price",
        value: formatGbp(analysis.estimatedSalePrice),
        valueClass: "green",
      },
    ],
    total: {
      label: "Gross Profit Potential",
      value: formatGbp(grossProfit),
    },
  };
}

function buildBtlRows(listing, analysis) {
  const annualGrossRent = analysis.grossMonthlyRent * 12;
  const grossYield =
    listing.yieldPercent ||
    Number(((annualGrossRent / listing.askingPrice) * 100).toFixed(1));
  const netMonthlyCashflow =
    analysis.grossMonthlyRent -
    analysis.mortgageMonthly -
    analysis.managementMonthly -
    analysis.insuranceMaintenanceMonthly;

  return {
    rows: [
      {
        label: "Gross Monthly Rent",
        value: formatGbp(analysis.grossMonthlyRent),
        valueClass: "green",
      },
      {
        label: "Annual Gross Rent",
        value: formatGbp(annualGrossRent),
        valueClass: "green",
      },
      { label: "Gross Yield", value: `${grossYield}%` },
      {
        label: "Est. Mortgage (75% LTV)",
        value: formatGbpNegativeMonthly(analysis.mortgageMonthly),
        valueClass: "neg",
      },
      {
        label: "Management (10%)",
        value: formatGbpNegativeMonthly(analysis.managementMonthly),
        valueClass: "neg",
      },
      {
        label: "Insurance & Maintenance",
        value: formatGbpNegativeMonthly(
          analysis.insuranceMaintenanceMonthly,
        ),
        valueClass: "neg",
      },
    ],
    total: {
      label: "Net Monthly Cashflow",
      value: formatGbpMonthly(netMonthlyCashflow),
    },
  };
}

function buildContactFields(contact, plan) {
  const unlocked = hasContactAccess(plan);

  if (unlocked) {
    return [
      { label: "Name", value: contact.name },
      { label: "Phone", value: contact.phone },
      { label: "Email", value: contact.email },
      { label: "Role", value: contact.role },
    ];
  }

  return [
    { label: "Name", value: contact.name },
    {
      label: "Phone",
      value: `${maskPhone(contact.phone)} (Upgrade to see)`,
      locked: true,
    },
    { label: "Email", value: maskEmail(contact.email), locked: true },
    { label: "Role", value: contact.role },
  ];
}

function formatAnalysisResponse(listing, analysis, { userPlan, isSaved }) {
  const fullAccess = hasFullAnalysisAccess(userPlan);
  const saving = listing.marketValue - listing.askingPrice;
  const yieldPercent =
    listing.yieldPercent ||
    Number(
      (
        ((analysis.grossMonthlyRent * 12) / listing.askingPrice) *
        100
      ).toFixed(1),
    );

  const flipAnalysis = buildFlipRows(listing, analysis);
  const btlAnalysis = buildBtlRows(listing, analysis);

  return {
    listingId: listing._id.toString(),
    title: listing.title,
    pageTitle: `Deal Analysis — ${listing.title}`,
    featureBadge: "Premium Feature",
    userPlan,
    hasFullAccess: fullAccess,
    isSaved,
    header: {
      address: analysis.address,
      sellerLine: `Submitted by: ${listing.sellerName || analysis.contact.name || "Verified Seller"}`,
      kycPassed: analysis.sellerKycPassed,
      kycBadge: analysis.sellerKycPassed ? "✓ KYC Passed" : "KYC Pending",
    },
    actions: {
      canSave: true,
      canReport: true,
      canContact: hasContactAccess(userPlan),
    },
    metrics: [
      {
        label: "Asking Price",
        value: formatGbp(listing.askingPrice),
        valueClass: "gold",
        sub: analysis.askingNote,
      },
      {
        label: "Market Value",
        value: formatGbp(listing.marketValue),
        sub: analysis.marketNote,
      },
      {
        label: "Discount",
        value: `${listing.discountPercent}%`,
        valueClass: "green",
        sub: `${formatGbp(saving)} below market`,
      },
      {
        label: "Est. Rental Yield",
        value: `${yieldPercent}%`,
        sub: `~${formatGbp(analysis.grossMonthlyRent)}/month gross`,
      },
    ],
    discountMeter: {
      percent: listing.discountPercent,
      label: `${listing.discountPercent}% Below Market Value`,
      fillWidth: Math.min(100, listing.discountPercent * 2),
    },
    flipAnalysis: fullAccess
      ? flipAnalysis
      : {
          locked: true,
          message: "Upgrade to Premium to unlock full flip analysis",
        },
    btlAnalysis: fullAccess
      ? btlAnalysis
      : {
          locked: true,
          message: "Upgrade to Premium to unlock buy-to-let analysis",
        },
    sellerDescription: fullAccess
      ? analysis.sellerDescription
      : analysis.sellerDescription.slice(0, 120) +
        (analysis.sellerDescription.length > 120 ? "…" : ""),
    comparableRange: analysis.comparableRange,
    contact: {
      locked: !hasContactAccess(userPlan),
      badge: hasContactAccess(userPlan) ? null : "Premium Only",
      fields: buildContactFields(analysis.contact, userPlan),
    },
    reportReasons: REPORT_REASONS,
  };
}

async function ensureAnalysisForListing(listing, options = {}) {
  let analysis = await DealAnalysis.findOne({ listingId: listing._id });
  if (analysis) return analysis;

  const payload = buildAnalysisPayload(listing, options);
  analysis = await DealAnalysis.create(payload);
  return analysis;
}

async function getListingAndAnalysis(listingId, options = {}) {
  const listing = await Listing.findOne({ _id: listingId, status: "live" });
  if (!listing) {
    throw new ApiError(404, "Listing not found");
  }

  const analysis = await ensureAnalysisForListing(listing, options);
  return { listing, analysis };
}

export const dealAnalysisService = {
  getReportReasons() {
    return REPORT_REASONS;
  },

  async getDeals(userId) {
    const userPlan = await getUserPlan(userId);
    const listings = await Listing.find({ status: "live" }).sort({
      publishedAt: -1,
    });

    const deals = listings.map((listing) => ({
      id: listing._id.toString(),
      title: listing.title,
      location: listing.location,
      discountPercent: listing.discountPercent,
      askingPrice: listing.askingPrice,
      propertyType: listing.propertyType,
      hasFullAnalysis: hasFullAnalysisAccess(userPlan),
    }));

    return {
      deals,
      userPlan,
      hasFullAccess: hasFullAnalysisAccess(userPlan),
      total: deals.length,
    };
  },

  async getAnalysis(userId, listingId) {
    const userPlan = await getUserPlan(userId);
    const { listing, analysis } = await getListingAndAnalysis(listingId);
    const isSaved = await ListingSave.exists({ userId, listingId });

    return formatAnalysisResponse(listing, analysis, {
      userPlan,
      isSaved: Boolean(isSaved),
    });
  },

  async saveDeal(userId, listingId) {
    return listingsService.saveListing(userId, listingId);
  },

  async unsaveDeal(userId, listingId) {
    return listingsService.unsaveListing(userId, listingId);
  },

  async reportDeal(userId, listingId, { reason, details }) {
    await getListingAndAnalysis(listingId);

    if (!reason) {
      throw new ApiError(400, "Report reason is required");
    }

    const validReason = REPORT_REASONS.find((item) => item.value === reason);
    if (!validReason) {
      throw new ApiError(400, "Invalid report reason");
    }

    const report = await DealAnalysisReport.create({
      userId,
      listingId,
      reason,
      details: details?.trim() || "",
    });

    return {
      id: report._id.toString(),
      status: report.status,
      message: "Report submitted. Our moderation team will review it shortly.",
    };
  },

  async getContact(userId, listingId) {
    const userPlan = await getUserPlan(userId);
    if (!hasContactAccess(userPlan)) {
      throw new ApiError(
        403,
        "Premium membership is required to view seller contact details",
      );
    }

    const { listing, analysis } = await getListingAndAnalysis(listingId);

    return {
      listingId: listing._id.toString(),
      title: listing.title,
      contact: {
        name: analysis.contact.name,
        phone: analysis.contact.phone,
        email: analysis.contact.email,
        role: analysis.contact.role,
      },
    };
  },

  async sendEnquiry(userId, listingId, { message }) {
    const trimmed = typeof message === "string" ? message.trim() : "";
    if (!trimmed) {
      throw new ApiError(400, "Please enter a message before sending.");
    }
    if (trimmed.length > 2000) {
      throw new ApiError(400, "Enquiry message must be 2000 characters or fewer.");
    }

    const userPlan = await getUserPlan(userId);
    if (!hasContactAccess(userPlan)) {
      throw new ApiError(
        403,
        "Premium membership is required to contact sellers",
      );
    }

    const buyer = await User.findById(userId).select(
      "firstName lastName email phone",
    );
    if (!buyer) throw new ApiError(404, "User not found");

    const { listing, analysis } = await getListingAndAnalysis(listingId);
    const sellerEmail = (analysis.contact?.email || "").trim();
    if (!sellerEmail) {
      throw new ApiError(
        400,
        "This listing does not have a seller email on file.",
      );
    }

    const buyerName =
      `${buyer.firstName || ""} ${buyer.lastName || ""}`.trim() || "Investor";
    const sellerName =
      analysis.contact?.name || listing.sellerName || "Seller";

    const sellerUserId = await enquiriesService.resolveSellerUserId(
      listing,
      sellerEmail,
    );

    const enquiry = await DealEnquiry.create({
      listingId: listing._id,
      buyerId: buyer._id,
      sellerUserId,
      sellerEmail,
      message: trimmed,
      status: "open",
      buyerReadAt: new Date(),
      sellerReadAt: null,
      replies: [],
    });

    const enquiriesInbox = inboxUrl();

    emailService.queueEmail(
      () =>
        emailService.sendEnquiryToSeller(
          sellerEmail,
          sellerName,
          listing.title,
          buyerName,
          buyer.email,
          buyer.phone || "",
          trimmed,
          enquiriesInbox,
        ),
      `enquiry-seller:${enquiry._id}`,
    );

    emailService.queueEmail(
      () =>
        emailService.sendEnquiryConfirmation(
          buyer.email,
          buyer.firstName || "there",
          listing.title,
          sellerName,
          enquiriesInbox,
        ),
      `enquiry-buyer:${enquiry._id}`,
    );

    if (sellerUserId) {
      await notificationService.create(sellerUserId, {
        type: "deal",
        title: "New enquiry on your listing",
        body: `${buyerName} asked about "${listing.title}". Open Enquiries to reply.`,
        channel: "Email + Platform",
      });
    }

    return {
      id: enquiry._id.toString(),
      status: enquiry.status,
      message:
        "Your enquiry has been sent. Track replies anytime under Enquiries.",
    };
  },
};
