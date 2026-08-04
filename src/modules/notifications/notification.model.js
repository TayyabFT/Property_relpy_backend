import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        "welcome",
        "deal",
        "approved",
        "rejected",
        "membership",
        "security",
        "system",
      ],
      default: "system",
    },
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true, trim: true },
    channel: { type: String, default: "Platform" },
    read: { type: Boolean, default: false },
  },
  { timestamps: true },
);

notificationSchema.index({ userId: 1, createdAt: -1 });

export const Notification = mongoose.model("Notification", notificationSchema);
