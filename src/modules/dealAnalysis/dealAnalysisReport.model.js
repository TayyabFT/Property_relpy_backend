import mongoose from "mongoose";

const dealAnalysisReportSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    listingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Listing",
      required: true,
      index: true,
    },
    reason: {
      type: String,
      enum: ["misleading", "spam", "duplicate", "inaccurate", "other"],
      required: true,
    },
    details: { type: String, trim: true, default: "" },
    status: {
      type: String,
      enum: ["pending", "reviewed", "resolved"],
      default: "pending",
    },
  },
  { timestamps: true },
);

dealAnalysisReportSchema.index({ userId: 1, listingId: 1, createdAt: -1 });

export const DealAnalysisReport = mongoose.model(
  "DealAnalysisReport",
  dealAnalysisReportSchema,
);
