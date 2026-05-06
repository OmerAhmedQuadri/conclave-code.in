import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { admins } from "@/lib/db";

const COOKIE_NAME = "fec_admin";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

function secret(): string {
  const s = process.env.ADMIN_SESSION_SECRET;
  if (!s || s.length < 16) {
    throw new Error("ADMIN_SESSION_SECRET must be set (>= 16 chars)");
  }
  return s;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

function safeEqualBuf(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function safeEqualStr(a: string, b: string): boolean {
  return safeEqualBuf(Buffer.from(a), Buffer.from(b));
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const derived = scryptSync(password, salt, 64);
  return `scrypt$${salt.toString("base64")}$${derived.toString("base64")}`;
}

export function verifyHash(password: string, stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const salt = Buffer.from(parts[1], "base64");
  const expected = Buffer.from(parts[2], "base64");
  const derived = scryptSync(password, salt, expected.length);
  return safeEqualBuf(derived, expected);
}

function envBootstrapMatch(email: string, password: string): boolean {
  const e = process.env.ADMIN_EMAIL;
  const p = process.env.ADMIN_PASSWORD;
  if (!e || !p) return false;
  return safeEqualStr(email.toLowerCase(), e.toLowerCase()) && safeEqualStr(password, p);
}

export async function verifyCredentials(
  email: string,
  password: string,
): Promise<string | null> {
  const normalized = email.trim().toLowerCase();
  if (envBootstrapMatch(normalized, password)) return normalized;
  const col = await admins();
  const admin = await col.findOne({ email: normalized });
  if (!admin) return null;
  if (!verifyHash(password, admin.passwordHash)) return null;
  return normalized;
}

function buildSessionToken(adminEmail: string): string {
  const expires = Date.now() + SESSION_TTL_MS;
  const payload = `${encodeURIComponent(adminEmail)}.${expires}`;
  return `${payload}.${sign(payload)}`;
}

interface ParsedSession {
  valid: boolean;
  email?: string;
}

function parseToken(token: string): ParsedSession {
  const parts = token.split(".");
  if (parts.length !== 3) return { valid: false };
  const [emailEnc, expStr, sig] = parts;
  const payload = `${emailEnc}.${expStr}`;
  const expected = sign(payload);
  if (!safeEqualStr(sig, expected)) return { valid: false };
  const expires = Number(expStr);
  if (!Number.isFinite(expires) || expires < Date.now()) return { valid: false };
  return { valid: true, email: decodeURIComponent(emailEnc) };
}

export async function setAdminSession(adminEmail: string) {
  const token = buildSessionToken(adminEmail);
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export async function clearAdminSession() {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

export async function getAdminEmail(): Promise<string | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const parsed = parseToken(token);
  return parsed.valid ? (parsed.email ?? null) : null;
}

export async function isAdmin(): Promise<boolean> {
  return (await getAdminEmail()) !== null;
}
