import mongoose from "mongoose";

const schema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  note: { type: String, default: "", maxlength: 200 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  status: { type: String, enum: ["active", "used", "revoked"], default: "active" },
  expiresAt: { type: Date, required: true },
  usedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  usedAt: { type: Date, default: null },
  offerEndsAt: { type: Date, default: null },
}, { timestamps: true });

export const PartnerInvite = mongoose.model("PartnerInvite", schema);
