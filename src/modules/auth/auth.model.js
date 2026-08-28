import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
      maxlength: 80,
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
      maxlength: 80,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 8,
      select: false,
    },
    plan: {
      type: String,
      enum: ["Premium", "VIP", "Ultra", "Commercial"],
      default: null,
    },
    subscriptionStatus: {
      type: String,
      enum: ["none", "trialing", "active", "past_due", "canceled"],
      default: "none",
    },
    /** End of complimentary 7-day trial (null if never on trial / trial cleared) */
    trialEndsAt: {
      type: Date,
      default: null,
    },
    /**
     * End of invite-only Founders Club / Commercial Partnership term (12 months).
     * Null when not on a commercial partnership.
     */
    commercialPartnershipEndsAt: {
      type: Date,
      default: null,
    },
    /** Invite token used to activate Commercial (audit) */
    commercialInviteCode: {
      type: String,
      default: "",
      trim: true,
    },
    stripeCustomerId: { type: String, default: "" },
    stripeSubscriptionId: { type: String, default: "" },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    status: {
      type: String,
      enum: ["active", "suspended", "banned"],
      default: "active",
    },
    kycStatus: {
      type: String,
      enum: ["pending", "in_progress", "approved", "rejected", "consider"],
      default: "pending",
    },
    stripeIdentitySessionId: {
      type: String,
      default: "",
      trim: true,
    },
    // Legacy provider fields — retained for existing records only
    onfidoApplicantId: {
      type: String,
      default: "",
      trim: true,
    },
    onfidoCheckId: {
      type: String,
      default: "",
      trim: true,
    },

    kycVerifiedAt: {
      type: Date,
      default: null,
    },
    kycReference: {
      type: String,
      default: "",
      trim: true,
    },
    phone: { type: String, trim: true, default: "" },
    location: { type: String, trim: true, default: "" },
    investorType: {
      type: String,
      enum: [
        "Property Investor",
        "Sourcing Agent",
        "Developer",
        "First-Time Buyer",
        "",
      ],
      default: "Property Investor",
    },
    notificationPrefs: {
      type: [String],
      default: [
        "New deal alerts (instant)",
        "Daily deal digest",
        "Listing approved",
        "Membership renewal",
        "Security alerts",
      ],
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: {
      type: String,
      select: false,
      default: null,
    },
    emailVerificationExpires: {
      type: Date,
      default: null,
    },
    passwordResetToken: {
      type: String,
      select: false,
      default: null,
    },
    passwordResetExpires: {
      type: Date,
      default: null,
    },
    planRenewalDate: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

userSchema.pre("save", async function hashPassword(next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.virtual("fullName").get(function fullName() {
  return `${this.firstName} ${this.lastName}`.trim();
});

userSchema.set("toJSON", {
  virtuals: true,
  transform(_doc, ret) {
    delete ret.password;
    delete ret.__v;
    return ret;
  },
});

export const User = mongoose.model("User", userSchema);
