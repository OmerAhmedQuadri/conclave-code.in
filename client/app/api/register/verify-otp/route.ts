import { NextResponse } from "next/server";
import { registerVerifyOtpSchema } from "@/models/register";
import { invitees, pendingOtps } from "@/lib/db";
import { OTP_MAX_ATTEMPTS } from "@/lib/tokens";
import { issueEmailVerificationToken } from "@/lib/verification-token";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request" }, { status: 400 });
  }

  const parsed = registerVerifyOtpSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid input";
    return NextResponse.json({ ok: false, message }, { status: 422 });
  }

  const token = parsed.data.token;
  const email = parsed.data.email.trim().toLowerCase();
  const otp = parsed.data.otp;

  const inviteeCol = await invitees();
  const invitee = await inviteeCol.findOne({ token });
  if (!invitee) {
    return NextResponse.json({ ok: false, message: "Invitation not found" }, { status: 404 });
  }

  const otpCol = await pendingOtps();
  const doc = await otpCol.findOne({ email });

  if (!doc) {
    return NextResponse.json(
      { ok: false, message: "No OTP found. Please request a new one." },
      { status: 404 }
    );
  }
  if (doc.expiresAt.getTime() < Date.now()) {
    return NextResponse.json(
      { ok: false, message: "OTP expired. Please request a new one." },
      { status: 410 }
    );
  }
  if ((doc.attempts ?? 0) >= OTP_MAX_ATTEMPTS) {
    return NextResponse.json(
      { ok: false, message: "Too many attempts. Please request a new OTP." },
      { status: 429 }
    );
  }
  if (doc.otp !== otp) {
    await otpCol.updateOne({ email }, { $inc: { attempts: 1 } });
    return NextResponse.json(
      { ok: false, message: "Incorrect OTP. Please try again." },
      { status: 401 }
    );
  }

  await otpCol.updateOne({ email }, { $set: { verifiedAt: new Date() } });

  const verificationToken = issueEmailVerificationToken(email);
  return NextResponse.json({ ok: true, verificationToken });
}
