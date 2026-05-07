import { NextResponse } from "next/server";
import { loginSchema } from "@/models/login";
import { admins } from "@/lib/db";
import { setAdminSession, verifyHash } from "@/lib/admin-auth";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request" }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "Email and password required" },
      { status: 422 }
    );
  }

  const email = parsed.data.email.trim().toLowerCase();
  const password = parsed.data.password;

  // Check bootstrap admin from env first (not stored in DB)
  const bootstrapEmail = process.env.ADMIN_EMAIL?.toLowerCase();
  const bootstrapPassword = process.env.ADMIN_PASSWORD;
  if (bootstrapEmail && bootstrapPassword && email === bootstrapEmail && password === bootstrapPassword) {
    await setAdminSession(email);
    return NextResponse.json({ ok: true, email, role: "admin" });
  }

  // Fall through to DB admins
  const user = await (await admins()).findOne({ email });
  if (!user || !verifyHash(password, user.passwordHash)) {
    return NextResponse.json({ ok: false, message: "Invalid credentials" }, { status: 401 });
  }

  await setAdminSession(email);
  return NextResponse.json({ ok: true, email, role: "admin" });
}
