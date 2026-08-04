import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../modules/auth/auth.model.js";

export async function protect(req, _res, next) {
  try {
    const header = req.headers.authorization;

    if (!header?.startsWith("Bearer ")) {
      throw new ApiError(401, "Not authenticated. Please sign in.");
    }

    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, env.jwtSecret);

    const user = await User.findById(decoded.sub);
    if (!user) {
      throw new ApiError(401, "User no longer exists. Please sign in again.");
    }

    if (user.status === "banned" || user.status === "suspended") {
      throw new ApiError(403, "Your account is not active. Contact support.");
    }

    req.user = {
      id: user._id.toString(),
      email: user.email,
      plan: user.plan,
      role: user.role || "user",
      status: user.status || "active",
    };

    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return next(new ApiError(401, "Invalid or expired session. Please sign in again."));
    }
    next(error);
  }
}

export function adminOnly(req, _res, next) {
  if (req.user?.role !== "admin") {
    return next(new ApiError(403, "Admin access required."));
  }
  next();
}

export async function requireActivePlan(req, _res, next) {
  try {
    if (req.user?.role === "admin") return next();

    const user = await User.findById(req.user.id).select(
      "plan subscriptionStatus",
    );
    if (!user || user.subscriptionStatus !== "active" || !user.plan) {
      throw new ApiError(
        402,
        "An active subscription is required to access this feature. Please subscribe to a plan.",
      );
    }

    next();
  } catch (error) {
    next(error);
  }
}
