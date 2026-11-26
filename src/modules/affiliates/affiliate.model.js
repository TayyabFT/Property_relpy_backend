import mongoose from "mongoose";

const { ObjectId } = mongoose.Schema.Types;

/** A marketer who earns a fixed commission for each referred user's first subscription payment. */
const affiliateSchema = new mongoose.Schema({
  user: { type: ObjectId, ref: "User", required: true, unique: true },
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  commissionGBP: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ["active", "paused"], default: "active" },
  note: { type: String, default: "", maxlength: 200 },
  clicks: { type: Number, default: 0 },
  createdBy: { type: ObjectId, ref: "User", required: true },
}, { timestamps: true });

/** One commission per referred user, earned on their first paid subscription payment. */
const commissionSchema = new mongoose.Schema({
  affiliate: { type: ObjectId, ref: "Affiliate", required: true, index: true },
  referredUser: { type: ObjectId, ref: "User", required: true, unique: true },
  amountGBP: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ["pending", "paid", "void"], default: "pending" },
  /** Stripe checkout session or invoice that triggered the commission */
  paymentReference: { type: String, default: "" },
  paymentAmountGBP: { type: Number, default: 0 },
  payout: { type: ObjectId, ref: "AffiliatePayout", default: null },
  paidAt: { type: Date, default: null },
  voidReason: { type: String, default: "", maxlength: 200 },
}, { timestamps: true });

/** A manual payment an admin made to an affiliate, covering one or more commissions. */
const payoutSchema = new mongoose.Schema({
  affiliate: { type: ObjectId, ref: "Affiliate", required: true, index: true },
  amountGBP: { type: Number, required: true, min: 0 },
  commissionCount: { type: Number, required: true },
  reference: { type: String, default: "", maxlength: 200 },
  paidBy: { type: ObjectId, ref: "User", required: true },
}, { timestamps: true });

export const Affiliate = mongoose.model("Affiliate", affiliateSchema);
export const AffiliateCommission = mongoose.model("AffiliateCommission", commissionSchema);
export const AffiliatePayout = mongoose.model("AffiliatePayout", payoutSchema);
