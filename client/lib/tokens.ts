import { randomBytes, randomInt } from "node:crypto";

export function generateInviteToken(): string {
  return randomBytes(24).toString("base64url");
}

export function generateOtp(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export const OTP_TTL_MS = 10 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;
