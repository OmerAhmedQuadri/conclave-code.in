import { NextResponse } from "next/server";
import { checkStatusVerifyOtpSchema, type CheckStatusInfo } from "@/models/check-status";
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

  const parsed = checkStatusVerifyOtpSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid input";
    return NextResponse.json({ ok: false, message }, { status: 422 });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const otp = parsed.data.otp;

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

  const inviteeCol = await invitees();
  const invitee = await inviteeCol.findOne({ email });
  if (!invitee) {
    return NextResponse.json(
      { ok: false, message: "We couldn't find your record." },
      { status: 404 }
    );
  }

  // Mark OTP consumed and increment refresh counter
  await otpCol.deleteOne({ email }).catch(() => {});
  await inviteeCol.updateOne(
    { _id: invitee._id },
    { $inc: { refreshCount: 1 }, $set: { lastRefreshedAt: new Date() } }
  );

  const verificationToken = issueEmailVerificationToken(email);
  const info: CheckStatusInfo = {
    email: invitee.email,
    name: invitee.name,
    status: invitee.status,
    source: invitee.source,
    registerUrl:
      invitee.status === "invited" || invitee.status === "registered"
        ? `${new URL(request.url).origin}/register/${invitee.token}`
        : undefined,
  };
  return NextResponse.json({ ok: true, verificationToken, info });
}
