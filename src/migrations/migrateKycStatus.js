import { User } from "../modules/auth/auth.model.js";

const LEGACY_KYC_MAP = {
  verified: "approved",
  failed: "rejected",
  unverified: "pending",
};

export async function migrateLegacyKycStatuses() {
  for (const [legacy, current] of Object.entries(LEGACY_KYC_MAP)) {
    const result = await User.updateMany(
      { kycStatus: legacy },
      { $set: { kycStatus: current } },
    );

    if (result.modifiedCount > 0) {
      console.log(
        `Migrated ${result.modifiedCount} user(s): kycStatus "${legacy}" → "${current}"`,
      );
    }
  }
}
