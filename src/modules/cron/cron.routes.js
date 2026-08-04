import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import { env } from "../../config/env.js";
import { runMembershipRenewalReminders } from "../../jobs/emailJobs.js";

const router = Router();

function assertCronAuth(req) {
  const secret = env.cronSecret;
  if (!secret) {
    throw new ApiError(
      503,
      "CRON_SECRET is not configured on this server.",
    );
  }

  const header = req.headers.authorization || "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7) : "";
  const querySecret = req.query.secret;

  if (bearer !== secret && querySecret !== secret) {
    throw new ApiError(401, "Invalid cron secret");
  }
}

router.get(
  "/membership-renewal",
  asyncHandler(async (req, res) => {
    assertCronAuth(req);
    const count = await runMembershipRenewalReminders();
    res.status(200).json({
      success: true,
      message: `Membership renewal reminders processed (${count})`,
      data: { count },
    });
  }),
);

router.post(
  "/membership-renewal",
  asyncHandler(async (req, res) => {
    assertCronAuth(req);
    const count = await runMembershipRenewalReminders();
    res.status(200).json({
      success: true,
      message: `Membership renewal reminders processed (${count})`,
      data: { count },
    });
  }),
);

export default router;
