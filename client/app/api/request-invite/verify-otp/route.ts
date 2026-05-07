import { NextResponse } from "next/server";
import { verifyInviteOtpSchema } from "@/models/request-invite";
import { invitees, pendingOtps } from "@/lib/db";
import { OTP_MAX_ATTEMPTS, generateInviteToken } from "@/lib/tokens";
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

  // Create a placeholder "incomplete" invitee record so admins can see users
  // who verified their email but didn't complete the full form. If the user
  // returns and submits, this record gets upgraded to status: "requested".
  const inviteeCol = await invitees();
  const existingInvitee = await inviteeCol.findOne({ email });
  if (!existingInvitee) {
    await inviteeCol.insertOne({
      email,
      name: doc.name,
      token: generateInviteToken(),
      status: "otp_verified",
      source: "portal",
      verifiedAt: new Date(),
      requestedAt: new Date(),
    });
  } else if (existingInvitee.source === "portal" && existingInvitee.status === "otp_verified") {
    // Resuming — bump verifiedAt to reflect latest activity
    await inviteeCol.updateOne(
      { _id: existingInvitee._id },
      { $set: { verifiedAt: new Date() } }
    );
  }

  const verificationToken = issueEmailVerificationToken(email);
  return NextResponse.json({ ok: true, verificationToken });
}
