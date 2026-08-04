import mongoose from "mongoose";

const dealAnalysisSchema = new mongoose.Schema(
  {
    listingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Listing",
      required: true,
      unique: true,
      index: true,
    },
    address: { type: String, required: true, trim: true },
    sellerKycPassed: { type: Boolean, default: false },
    askingNote: { type: String, default: "Negotiable" },
    marketNote: { type: String, default: "Est. via comparables" },
    stampDuty: { type: Number, default: 0, min: 0 },
    refurbishment: { type: Number, default: 0, min: 0 },
    legalFinanceCosts: { type: Number, default: 0, min: 0 },
    estimatedSalePrice: { type: Number, required: true, min: 0 },
    grossMonthlyRent: { type: Number, default: 0, min: 0 },
    mortgageMonthly: { type: Number, default: 0, min: 0 },
    managementMonthly: { type: Number, default: 0, min: 0 },
    insuranceMaintenanceMonthly: { type: Number, default: 0, min: 0 },
    sellerDescription: { type: String, trim: true, default: "" },
    comparableRange: { type: String, trim: true, default: "" },
    contact: {
      name: { type: String, trim: true, default: "" },
      phone: { type: String, trim: true, default: "" },
      email: { type: String, trim: true, default: "" },
      role: { type: String, trim: true, default: "" },
    },
  },
  { timestamps: true },
);

export const DealAnalysis = mongoose.model("DealAnalysis", dealAnalysisSchema);
