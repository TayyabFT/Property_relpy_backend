import { ApiError } from "../../utils/ApiError.js";
import { Submission } from "../overview/submission.model.js";
import { User } from "../auth/auth.model.js";
import { billingService } from "../billing/billing.service.js";
import { LISTING_FEE_GBP } from "../../config/plans.js";

const FORM_OPTIONS = {
  propertyTypes: [
    "House – Terraced",
    "House – Semi-Detached",
    "House – Detached",
    "Flat / Apartment",
    "Bungalow",
    "HMO",
    "Commercial",
    "Land",
    "Mixed Use",
  ],
  bedrooms: ["Studio", "1", "2", "3", "4", "5", "6+", "N/A (Commercial/Land)"],
  roles: [
    "Property Owner",
    "Sourcing Agent",
    "Estate Agent",
    "Solicitor",
    "Other",
  ],
  strategyTags: [
    "Flip / Refurbishment",
    "Buy-to-Let",
    "HMO",
    "Commercial Conversion",
    "Serviced Accommodation",
    "Development Land",
    "BRRR Strategy",
    "Lease Option",
    "Mixed Use",
  ],
  imageLimits: {
    maxImages: 20,
    maxSizeMb: 10,
    acceptedFormats: ["JPG", "PNG", "WebP"],
  },
};

const STATUS_LABELS = {
  draft: "Draft",
  awaiting_payment: "Payment Required",
  pending: "Pending Review",
  live: "Live",
  rejected: "Rejected",
};

function calcDiscount(askingPrice, marketValue) {
  if (!marketValue || marketValue <= 0 || !askingPrice || askingPrice <= 0) {
    return 0;
  }
  if (askingPrice >= marketValue) return 0;
  return Math.round(((marketValue - askingPrice) / marketValue) * 100);
}

function buildLocation({ town, county, postcode }) {
  const parts = [town, county].filter((part) => part && part.trim());
  const base = parts.join(", ");
  if (base && postcode) return `${base} · ${postcode.toUpperCase()}`;
  return base || postcode?.toUpperCase() || "";
}

function isValidEmail(email) {
  return /^\S+@\S+\.\S+$/.test(email);
}

function normalizePayload(payload = {}) {
  const askingPrice = Number(payload.askingPrice) || 0;
  const marketValue = Number(payload.marketValue) || 0;

  return {
    property: (payload.title || payload.property || "").trim(),
    description: (payload.description || "").trim(),
    propertyType: (payload.propertyType || "").trim(),
    bedrooms: (payload.bedrooms || "").trim(),
    streetAddress: (payload.streetAddress || "").trim(),
    postcode: (payload.postcode || "").trim(),
    town: (payload.town || "").trim(),
    county: (payload.county || "").trim(),
    askingPrice,
    marketValue,
    discountPercent: calcDiscount(askingPrice, marketValue),
    strategies: Array.isArray(payload.strategies)
      ? payload.strategies.filter((tag) => typeof tag === "string" && tag.trim())
      : [],
    images: Array.isArray(payload.images)
      ? payload.images.filter((img) => typeof img === "string" && img.trim())
      : [],
    contact: {
      name: (payload.contact?.name || "").trim(),
      role: (payload.contact?.role || "").trim(),
      phone: (payload.contact?.phone || "").trim(),
      email: (payload.contact?.email || "").trim(),
    },
  };
}

function validateForSubmit(data) {
  const errors = [];

  if (!data.property) errors.push("Property title is required");
  if (!data.description) errors.push("Property description is required");
  if (!data.propertyType) errors.push("Property type is required");
  if (!data.bedrooms) errors.push("Number of bedrooms is required");
  if (!data.postcode) errors.push("Postcode is required");
  if (!data.town) errors.push("Town / City is required");
  if (!data.askingPrice || data.askingPrice <= 0)
    errors.push("A valid asking price is required");
  if (!data.marketValue || data.marketValue <= 0)
    errors.push("A valid estimated market value is required");
  if (data.marketValue && data.askingPrice && data.askingPrice > data.marketValue)
    errors.push("Asking price cannot be higher than market value");
  if (!data.strategies.length)
    errors.push("Select at least one investment strategy");
  if (!data.contact.name) errors.push("Your name is required");
  if (!data.contact.role) errors.push("Your role is required");
  if (!data.contact.phone) errors.push("Phone number is required");
  if (!data.contact.email) errors.push("Email address is required");
  if (data.contact.email && !isValidEmail(data.contact.email))
    errors.push("A valid email address is required");

  return errors;
}

function formatSubmission(doc) {
  return {
    id: doc._id.toString(),
    title: doc.property,
    description: doc.description,
    propertyType: doc.propertyType,
    bedrooms: doc.bedrooms,
    streetAddress: doc.streetAddress,
    postcode: doc.postcode,
    town: doc.town,
    county: doc.county,
    location: doc.location,
    askingPrice: doc.askingPrice,
    marketValue: doc.marketValue,
    discountPercent: doc.discountPercent,
    strategies: doc.strategies,
    images: doc.images,
    contact: doc.contact,
    status: doc.status,
    statusLabel: STATUS_LABELS[doc.status] || doc.status,
    paymentStatus: doc.paymentStatus,
    submittedAt: doc.submittedAt,
    updatedAt: doc.updatedAt,
  };
}

export const submitService = {
  getOptions() {
    return FORM_OPTIONS;
  },

  previewDiscount(askingPrice, marketValue) {
    const asking = Number(askingPrice) || 0;
    const market = Number(marketValue) || 0;
    const discountPercent = calcDiscount(asking, market);
    return {
      askingPrice: asking,
      marketValue: market,
      discountPercent,
      saving: market > asking ? market - asking : 0,
    };
  },

  async createSubmission(userId, payload) {
    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, "User not found");
    if (user.kycStatus !== "approved") {
      throw new ApiError(
        403,
        "Identity verification is required before submitting listings. Please complete KYC verification first.",
      );
    }

    const data = normalizePayload(payload);
    const errors = validateForSubmit(data);

    if (errors.length) {
      throw new ApiError(400, errors[0]);
    }

    const submission = await Submission.create({
      userId,
      ...data,
      location: buildLocation(data),
      status: "awaiting_payment",
      paymentStatus: "pending",
      listingFeeGBP: LISTING_FEE_GBP,
      submittedAt: new Date(),
    });

    const checkoutUrl = await billingService.createListingCheckout(user, submission);

    return { submissionId: submission._id.toString(), checkoutUrl };
  },

  async createCheckoutForExistingSubmission(userId, submissionId) {
    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, "User not found");

    const submission = await Submission.findOne({ _id: submissionId, userId });
    if (!submission) throw new ApiError(404, "Submission not found");
    if (submission.status !== "awaiting_payment") {
      throw new ApiError(400, "This submission does not have a pending payment.");
    }

    const checkoutUrl = await billingService.createListingCheckout(user, submission);
    return { submissionId: submission._id.toString(), checkoutUrl };
  },

  async saveDraft(userId, payload, draftId) {
    const data = normalizePayload(payload);

    if (!data.property) {
      throw new ApiError(400, "A property title is required to save a draft");
    }

    const update = {
      userId,
      ...data,
      location: buildLocation(data),
      status: "draft",
    };

    if (draftId) {
      const existing = await Submission.findOne({ _id: draftId, userId });
      if (!existing) {
        throw new ApiError(404, "Draft not found");
      }
      if (existing.status !== "draft") {
        throw new ApiError(400, "Only drafts can be updated");
      }

      existing.set(update);
      await existing.save();
      return formatSubmission(existing);
    }

    const draft = await Submission.create(update);
    return formatSubmission(draft);
  },

  async getDrafts(userId) {
    const drafts = await Submission.find({ userId, status: "draft" }).sort({
      updatedAt: -1,
    });
    return drafts.map(formatSubmission);
  },

  async getSubmissions(userId) {
    const submissions = await Submission.find({
      userId,
      status: { $ne: "draft" },
    }).sort({ submittedAt: -1 });

    const reconciled = [];
    for (const submission of submissions) {
      if (submission.status === "awaiting_payment") {
        const updated =
          await billingService.reconcileListingPayment(submission);
        reconciled.push(formatSubmission(updated || submission));
      } else {
        reconciled.push(formatSubmission(submission));
      }
    }
    return reconciled;
  },

  async getById(userId, id) {
    const submission = await Submission.findOne({ _id: id, userId });
    if (!submission) {
      throw new ApiError(404, "Submission not found");
    }
    return formatSubmission(submission);
  },

  async deleteDraft(userId, id) {
    const draft = await Submission.findOne({ _id: id, userId });
    if (!draft) {
      throw new ApiError(404, "Draft not found");
    }
    if (draft.status !== "draft") {
      throw new ApiError(400, "Only drafts can be deleted");
    }
    await draft.deleteOne();
    return { deleted: true };
  },
};
