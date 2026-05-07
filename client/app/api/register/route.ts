import { NextResponse } from "next/server";
import { registerSubmitSchema } from "@/models/register";
import { invitees, pendingOtps, admins } from "@/lib/db";
import { verifyEmailVerificationToken } from "@/lib/verification-token";
import { sendInvitationAcceptedNotification } from "@/lib/mailer";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request" }, { status: 400 });
  }

  const parsed = registerSubmitSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid form data";
    return NextResponse.json({ ok: false, message }, { status: 422 });
  }

  const token = parsed.data.token;
  const email = parsed.data.email.trim().toLowerCase();
  const name = parsed.data.name.trim();

  if (!verifyEmailVerificationToken(parsed.data.verificationToken, email)) {
    return NextResponse.json(
      { ok: false, message: "Email verification expired. Please verify your email again." },
      { status: 401 }
    );
  }

  const otpCol = await pendingOtps();
  const otpDoc = await otpCol.findOne({ email });
  if (!otpDoc?.verifiedAt) {
    return NextResponse.json(
      { ok: false, message: "Please verify your email before submitting." },
      { status: 401 }
    );
  }

  const col = await invitees();
  const invitee = await col.findOne({ token });
  if (!invitee) {
    return NextResponse.json({ ok: false, message: "Invitation not found" }, { status: 404 });
  }
  if (invitee.status === "approved" || invitee.status === "rejected") {
    return NextResponse.json(
      { ok: false, message: "This invitation has already been finalised" },
      { status: 409 }
    );
  }

  const emailChanged = email !== invitee.email.toLowerCase();
  if (emailChanged) {
    // Make sure the new email isn't already used by a different invitee
    const clash = await col.findOne({ email, token: { $ne: token } });
    if (clash) {
      return NextResponse.json(
        {
          ok: false,
          message: "That email is already in our system. Please use a different one.",
        },
        { status: 409 }
      );
    }
  }

  const requestData = {
    studentName: parsed.data.studentName.trim(),
    studentAge: parsed.data.studentAge.trim(),
    school: parsed.data.school.trim(),
    city: parsed.data.city.trim(),
    hearAbout: parsed.data.hearAbout,
    referralFrom: parsed.data.referralFrom?.trim() || undefined,
    question: parsed.data.question?.trim() || undefined,
  };

  const now = new Date();
  const update: Record<string, unknown> = {
    email,
    name,
    status: "otp_verified",
    requestData,
    verifiedAt: now,
    registeredAt: now,
  };
  if (emailChanged) {
    // Preserve the email the admin originally invited
    update.originalEmail = invitee.originalEmail ?? invitee.email;
  }
  if (invitee.autoApprove) {
    // Schedule auto-approval 2 hours after acceptance
    update.autoApproveAfter = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  }

  await col.updateOne({ token }, { $set: update });

  // Clean up the consumed pending OTP
  await otpCol.deleteOne({ email }).catch(() => {});

  // Notify opted-in admins that an invitee just accepted their invitation
  // (fire-and-forget — a mail failure should not block the user response).
  (async () => {
    try {
      const adminCol = await admins();
      const adminDocs = await adminCol
        .find(
          { role: "admin", $or: [{ receiveEmails: true }, { receiveEmails: { $exists: false } }] },
          { projection: { email: 1 } }
        )
        .toArray();
      const recipients = adminDocs.map((d) => d.email);
      if (recipients.length === 0) return;
      await sendInvitationAcceptedNotification({
        to: recipients,
        name,
        email,
        emailChanged,
        originalEmail: emailChanged ? invitee.originalEmail ?? invitee.email : undefined,
      });
    } catch (err) {
      console.error("[register] invitation-accepted notification failed:", err);
    }
  })();

  return NextResponse.json({ ok: true, email, emailChanged });
}
