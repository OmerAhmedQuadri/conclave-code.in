import { NextResponse } from "next/server";
import { adminLoginSchema } from "@/lib/validations";
import { setAdminSession, verifyCredentials } from "@/lib/admin-auth";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request" }, { status: 400 });
  }

  const parsed = adminLoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "Email and password required" }, { status: 422 });
  }

  const adminEmail = await verifyCredentials(parsed.data.email, parsed.data.password);
  if (!adminEmail) {
    return NextResponse.json({ ok: false, message: "Invalid credentials" }, { status: 401 });
  }

  await setAdminSession(adminEmail);
  return NextResponse.json({ ok: true });
}
