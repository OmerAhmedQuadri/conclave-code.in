import { NextResponse } from "next/server";
import { verifyOtpSchema } from "@/models/verify-otp";
import { invitees } from "@/lib/db";
import { OTP_MAX_ATTEMPTS } from "@/lib/tokens";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request" }, { status: 400 });
  }

  const parsed = verifyOtpSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "Enter the 6-digit code" }, { status: 422 });
  }

  const col = await invitees();
  const doc = await col.findOne({ token: parsed.data.token });
  if (!doc) {
    return NextResponse.json({ ok: false, message: "Invitation not found" }, { status: 404 });
  }
  if (doc.status === "otp_verified" || doc.status === "approved") {
    return NextResponse.json({ ok: true, alreadyVerified: true });
  }
  if (!doc.otp || !doc.otpExpiresAt) {
    return NextResponse.json({ ok: false, message: "Please register first" }, { status: 409 });
  }
  if (doc.otpExpiresAt.getTime() < Date.now()) {
    return NextResponse.json({ ok: false, message: "Code expired — request a new one" }, { status: 410 });
  }
  if ((doc.otpAttempts ?? 0) >= OTP_MAX_ATTEMPTS) {
    return NextResponse.json(
      { ok: false, message: "Too many attempts — request a new code" },
      { status: 429 },
    );
  }

  if (doc.otp !== parsed.data.otp) {
    await col.updateOne({ token: parsed.data.token }, { $inc: { otpAttempts: 1 } });
    return NextResponse.json({ ok: false, message: "Incorrect code" }, { status: 401 });
  }

  await col.updateOne(
    { token: parsed.data.token },
    {
      $set: { status: "otp_verified", verifiedAt: new Date() },
      $unset: { otp: "", otpExpiresAt: "", otpAttempts: "" },
    },
  );

  return NextResponse.json({ ok: true });
}
