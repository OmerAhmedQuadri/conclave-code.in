import { NextResponse } from "next/server";
import { verifyInviteOtpSchema } from "@/models/request-invite";
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

  const parsed = verifyInviteOtpSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid input";
    return NextResponse.json({ ok: false, message }, { status: 422 });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const otp = parsed.data.otp;

  const col = await pendingOtps();
  const doc = await col.findOne({ email });

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
    await col.updateOne({ email }, { $inc: { attempts: 1 } });
    return NextResponse.json(
      { ok: false, message: "Incorrect OTP. Please try again." },
      { status: 401 }
    );
  }

  await col.updateOne({ email }, { $set: { verifiedAt: new Date() } });

  // The placeholder invitee was already created at send-otp time.
  // Just stamp verifiedAt on it so admins can tell apart "OTP sent but not
  // verified" from "OTP verified but form not submitted".
  const inviteeCol = await invitees();
  await inviteeCol.updateOne(
    { email, source: "portal", status: "otp_verified" },
    { $set: { verifiedAt: new Date() } }
  );

  const verificationToken = issueEmailVerificationToken(email);
  return NextResponse.json({ ok: true, verificationToken });
}
