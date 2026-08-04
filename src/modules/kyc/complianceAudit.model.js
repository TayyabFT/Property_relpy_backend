import mongoose from "mongoose";

const complianceAuditSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    provider: {
      type: String,
      default: "stripe",
    },
    reference: {
      type: String,
      required: true,
    },
    result: {
      type: String,
      default: "",
    },
    eventType: {
      type: String,
      required: true,
    },
    rawPayload: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    occurredAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

export const ComplianceAudit = mongoose.model(
  "ComplianceAudit",
  complianceAuditSchema,
);
