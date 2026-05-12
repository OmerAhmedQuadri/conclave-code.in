import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { volunteers } from "@/lib/db";
import { verifyHash } from "@/lib/admin-auth";

const COOKIE_NAME = "fec_volunteer";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

function secret(): string {
  const s = process.env.ADMIN_SESSION_SECRET;
  if (!s || s.length < 16) {
    throw new Error("ADMIN_SESSION_SECRET must be set (>= 16 chars)");
  }
  return s;
}

// Domain-prefixed signature so a volunteer session token can never be confused
// with an admin session token, even though both use the same secret.
function sign(payload: string): string {
  return createHmac("sha256", secret()).update(`volunteer:${payload}`).digest("base64url");
}

function safeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

function buildSessionToken(email: string): string {
  const expires = Date.now() + SESSION_TTL_MS;
  const payload = `${encodeURIComponent(email)}.${expires}`;
  return `${payload}.${sign(payload)}`;
}

interface ParsedSession {
  valid: boolean;
  email?: string;
}

function parseToken(token: string): ParsedSession {
  const lastDot = token.lastIndexOf(".");
  if (lastDot === -1) return { valid: false };
  const sig = token.slice(lastDot + 1);
  const rest = token.slice(0, lastDot);
  const secondLastDot = rest.lastIndexOf(".");
  if (secondLastDot === -1) return { valid: false };
  const expStr = rest.slice(secondLastDot + 1);
  const emailEnc = rest.slice(0, secondLastDot);
  const payload = `${emailEnc}.${expStr}`;
  if (!safeEqualStr(sig, sign(payload))) return { valid: false };
  const expires = Number(expStr);
  if (!Number.isFinite(expires) || expires < Date.now()) return { valid: false };
  return { valid: true, email: decodeURIComponent(emailEnc) };
}

export async function verifyVolunteerCredentials(
  email: string,
  password: string
): Promise<{ email: string; name: string; id: string } | null> {
  const normalized = email.trim().toLowerCase();
  const col = await volunteers();
  const doc = await col.findOne({ email: normalized });
  if (!doc) return null;
  if (!verifyHash(password, doc.passwordHash)) return null;
  return { email: doc.email, name: doc.name, id: doc._id?.toString() ?? "" };
}

export async function setVolunteerSession(email: string) {
  const token = buildSessionToken(email);
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export async function clearVolunteerSession() {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

export async function getVolunteerEmail(): Promise<string | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const parsed = parseToken(token);
  return parsed.valid ? (parsed.email ?? null) : null;
}

export async function getCurrentVolunteer(): Promise<{
  id: string;
  email: string;
  name: string;
} | null> {
  const email = await getVolunteerEmail();
  if (!email) return null;
  const col = await volunteers();
  const doc = await col.findOne({ email });
  if (!doc) return null;
  return { id: doc._id?.toString() ?? "", email: doc.email, name: doc.name };
}
