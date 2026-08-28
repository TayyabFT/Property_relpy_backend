import mongoose from "mongoose";
import crypto from "crypto";

const commercialInviteSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    /** Optional: lock invite to a specific email */
    email: {
      type: String,
      default: "",
      lowercase: true,
      trim: true,
    },
    note: {
      type: String,
      default: "",
      trim: true,
      maxlength: 200,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    usedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    usedAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ["active", "used", "revoked"],
      default: "active",
    },
  },
  { timestamps: true },
);

commercialInviteSchema.statics.generateCode = function generateCode() {
  // e.g. FC-A3K9M2
  const raw = crypto.randomBytes(4).toString("hex").toUpperCase().slice(0, 6);
  return `FC-${raw}`;
};

export const CommercialInvite =
  mongoose.models.CommercialInvite ||
  mongoose.model("CommercialInvite", commercialInviteSchema);
