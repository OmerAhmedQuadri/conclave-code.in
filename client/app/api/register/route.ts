import { NextResponse } from "next/server";
import { registerSubmitSchema } from "@/models/register";
import { invitees, pendingOtps, admins } from "@/lib/db";
import { AUTO_APPROVE_DELAY_MS } from "@/models/invitee";
import { verifyEmailVerificationToken } from "@/lib/verification-token";
import {
  sendConfirmationEmail,
  sendInvitationAcceptedNotification,
} from "@/lib/mailer";

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
  const mode = invitee.autoApproveMode ?? "never";
  const update: Record<string, unknown> = {
    email,
    name,
    requestData,
    verifiedAt: now,
    registeredAt: now,
  };
  if (emailChanged) {
    // Preserve the email the admin originally invited
    update.originalEmail = invitee.originalEmail ?? invitee.email;
  }

  if (mode === "immediate") {
    // Skip the manual approval step entirely
    update.status = "approved";
    update.decidedAt = now;
    update.decidedBy = "auto";
  } else {
    update.status = "otp_verified";
    if (mode === "delayed") {
      update.autoApproveAfter = new Date(now.getTime() + AUTO_APPROVE_DELAY_MS);
    }
    // mode === "never" → no autoApproveAfter, admin decides manually
  }

  await col.updateOne({ token }, { $set: update });

  // Confirmation email if we just auto-approved
  if (mode === "immediate") {
    sendConfirmationEmail({ to: email, name }).catch((err) =>
      console.error("[register] confirmation email failed:", err)
    );
  }

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
