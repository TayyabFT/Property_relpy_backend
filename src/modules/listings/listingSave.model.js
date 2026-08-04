import mongoose from "mongoose";

const listingSaveSchema = new mongoose.Schema(
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
    savedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

listingSaveSchema.index({ userId: 1, listingId: 1 }, { unique: true });

export const ListingSave = mongoose.model("ListingSave", listingSaveSchema);
