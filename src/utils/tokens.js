import crypto from "crypto";

const TOKEN_BYTES = 32;

export function generateSecureToken() {
  return crypto.randomBytes(TOKEN_BYTES).toString("hex");
}

export function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function verificationExpiry() {
  return new Date(Date.now() + 24 * 60 * 60 * 1000);
}

export function passwordResetExpiry() {
  return new Date(Date.now() + 60 * 60 * 1000);
}
