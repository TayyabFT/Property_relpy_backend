import mongoose from "mongoose";

const listingSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    locationSearch: { type: String, required: true, trim: true, index: true },
    postcode: { type: String, trim: true, default: "" },
    propertyType: {
      type: String,
      enum: [
        "House",
        "Flat",
        "HMO",
        "Commercial",
        "Land",
        "Bungalow",
        "Detached",
      ],
      required: true,
    },
    bedrooms: { type: Number, min: 0, default: 0 },
    askingPrice: { type: Number, required: true, min: 0 },
    marketValue: { type: Number, required: true, min: 0 },
    discountPercent: { type: Number, required: true, min: 0, max: 100 },
    yieldPercent: { type: Number, min: 0, default: null },
    strategies: [{ type: String, trim: true }],
    tags: [
      {
        label: { type: String, required: true },
        badge: { type: String, default: "" },
      },
    ],
    placeholder: { type: String, default: "🏠" },
    featured: { type: Boolean, default: false },
    accessTier: {
      type: String,
      enum: ["Premium", "VIP", "Ultra"],
      default: "Premium",
    },
    saveCount: { type: Number, default: 0, min: 0 },
    description: { type: String, trim: true, default: "" },
    sellerName: { type: String, trim: true, default: "" },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    sourceSubmissionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Submission",
      default: null,
      index: true,
    },
    /** Removed automatically if the submitter's free trial ends without a paid plan */
    isTrialListing: { type: Boolean, default: false, index: true },
    status: {
      type: String,
      enum: ["live", "pending", "archived", "sold"],
      default: "live",
    },
    salePrice: { type: Number, default: null },
    soldAt: { type: Date, default: null },
    commissionGBP: { type: Number, default: null },
    commissionInvoiceStatus: {
      type: String,
      enum: ["not_invoiced", "invoiced", "paid"],
      default: "not_invoiced",
    },
    stripeInvoiceId: { type: String, default: "" },
    publishedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true },
);

listingSchema.index({ status: 1, publishedAt: -1 });
listingSchema.index({ discountPercent: -1 });
listingSchema.index({ askingPrice: 1 });
listingSchema.index({ yieldPercent: -1 });

export const Listing = mongoose.model("Listing", listingSchema);
