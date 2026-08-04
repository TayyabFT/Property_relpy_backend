import { ApiError } from "../utils/ApiError.js";

export function errorHandler(err, _req, res, _next) {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal server error";

  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      success: false,
      message: messages.join(", "),
    });
  }

  if (err.code === 11000) {
    return res.status(409).json({
      success: false,
      message: "An account with this email already exists",
    });
  }

  if (process.env.NODE_ENV !== "production") {
    console.error(err);
  }

  res.status(statusCode).json({
    success: false,
    message,
  });
}

export function notFound(_req, _res, next) {
  next(new ApiError(404, "Route not found"));
}
