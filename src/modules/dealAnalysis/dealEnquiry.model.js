import mongoose from "mongoose";

const replySchema = new mongoose.Schema(
  {
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    authorRole: {
      type: String,
      enum: ["buyer", "seller"],
      required: true,
    },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

const dealEnquirySchema = new mongoose.Schema(
  {
    listingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Listing",
      required: true,
      index: true,
    },
    buyerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    sellerUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    sellerEmail: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    status: {
      type: String,
      enum: ["open", "replied", "closed", "sent", "failed"],
      default: "open",
    },
    sellerReadAt: { type: Date, default: null },
    buyerReadAt: { type: Date, default: null },
    replies: { type: [replySchema], default: [] },
  },
  { timestamps: true },
);

dealEnquirySchema.index({ listingId: 1, buyerId: 1, createdAt: -1 });
dealEnquirySchema.index({ sellerUserId: 1, createdAt: -1 });
dealEnquirySchema.index({ buyerId: 1, createdAt: -1 });

export const DealEnquiry = mongoose.model("DealEnquiry", dealEnquirySchema);
