import { NextResponse } from "next/server";
import { resendOtpSchema } from "@/models/resend-otp";
import { invitees } from "@/lib/db";
import { generateOtp, OTP_TTL_MS } from "@/lib/tokens";
import { sendOtpEmail } from "@/lib/mailer";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request" }, { status: 400 });
  }

  const parsed = resendOtpSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "Invalid request" }, { status: 422 });
  }

  const col = await invitees();
  const doc = await col.findOne({ token: parsed.data.token });
  if (!doc) {
    return NextResponse.json({ ok: false, message: "Invitation not found" }, { status: 404 });
  }
  if (doc.status !== "registered") {
    return NextResponse.json({ ok: false, message: "Please register first" }, { status: 409 });
  }

  const otp = generateOtp();
  await col.updateOne(
    { token: parsed.data.token },
    { $set: { otp, otpExpiresAt: new Date(Date.now() + OTP_TTL_MS), otpAttempts: 0 } }
  );

  try {
    await sendOtpEmail({ to: doc.email, otp });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send OTP email";
    return NextResponse.json({ ok: false, message }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
