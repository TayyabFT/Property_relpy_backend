import mongoose from "mongoose";

const submissionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    property: { type: String, trim: true, default: "" },
    description: { type: String, trim: true, default: "" },
    propertyType: { type: String, trim: true, default: "" },
    bedrooms: { type: String, trim: true, default: "" },
    streetAddress: { type: String, trim: true, default: "" },
    postcode: { type: String, trim: true, default: "" },
    town: { type: String, trim: true, default: "" },
    county: { type: String, trim: true, default: "" },
    location: { type: String, trim: true, default: "" },
    askingPrice: { type: Number, min: 0, default: 0 },
    marketValue: { type: Number, min: 0, default: 0 },
    discountPercent: { type: Number, min: 0, max: 100, default: 0 },
    strategies: [{ type: String, trim: true }],
    images: [{ type: String, trim: true }],
    contact: {
      name: { type: String, trim: true, default: "" },
      role: { type: String, trim: true, default: "" },
      phone: { type: String, trim: true, default: "" },
      email: { type: String, trim: true, default: "" },
    },
    status: {
      type: String,
      enum: ["draft", "awaiting_payment", "pending", "live", "rejected"],
      default: "pending",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid"],
      default: "pending",
    },
    stripeCheckoutSessionId: { type: String, default: "" },
    stripePaymentIntentId: { type: String, default: "" },
    listingFeeGBP: { type: Number, default: 0 },
    /** True when this submission used the 1 free trial listing slot */
    isTrialListing: { type: Boolean, default: false, index: true },
    submittedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

export const Submission = mongoose.model("Submission", submissionSchema);
