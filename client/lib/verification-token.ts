import { createHmac, timingSafeEqual } from "node:crypto";

// Long-lived: this token also doubles as a "stay logged in" session for the
// invitation-status checker after a user submits a request or registers. The
// real security gate is the OTP that must be solved before the token is issued.
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function secret(): string {
  const s = process.env.ADMIN_SESSION_SECRET;
  if (!s || s.length < 16) {
    throw new Error("ADMIN_SESSION_SECRET must be set (>= 16 chars)");
  }
  return s;
}

// Domain-prefixed HMAC so a token signed for one purpose cannot be reused for another.
function sign(payload: string): string {
  return createHmac("sha256", secret()).update(`email-verify:${payload}`).digest("base64url");
}

function safeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export function issueEmailVerificationToken(email: string): string {
  const expires = Date.now() + TTL_MS;
  const payload = `${encodeURIComponent(email.toLowerCase())}.${expires}`;
  return `${payload}.${sign(payload)}`;
}

export function verifyEmailVerificationToken(token: string, email: string): boolean {
  const lastDot = token.lastIndexOf(".");
  if (lastDot === -1) return false;
  const sig = token.slice(lastDot + 1);
  const rest = token.slice(0, lastDot);
  const secondLastDot = rest.lastIndexOf(".");
  if (secondLastDot === -1) return false;
  const expStr = rest.slice(secondLastDot + 1);
  const emailEnc = rest.slice(0, secondLastDot);

  const payload = `${emailEnc}.${expStr}`;
  if (!safeEqualStr(sig, sign(payload))) return false;

  const expires = Number(expStr);
  if (!Number.isFinite(expires) || expires < Date.now()) return false;

  return decodeURIComponent(emailEnc) === email.trim().toLowerCase();
}
