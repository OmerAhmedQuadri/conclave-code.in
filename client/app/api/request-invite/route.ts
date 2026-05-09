import { NextResponse } from "next/server";
import { requestInviteSchema } from "@/models/request-invite";
import { invitees, admins, pendingOtps } from "@/lib/db";
import { sendNewRequestNotification } from "@/lib/mailer";
import { verifyEmailVerificationToken } from "@/lib/verification-token";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request" }, { status: 400 });
  }

  const parsed = requestInviteSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid form";
    return NextResponse.json({ ok: false, message }, { status: 422 });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const name = parsed.data.name.trim();

  // Verification gate: email must have completed OTP step recently
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
  const existing = await col.findOne({ email });

  if (!existing) {
    // Should not happen — verify-otp creates the placeholder. Treat as expired.
    return NextResponse.json(
      { ok: false, message: "Email verification expired. Please verify your email again." },
      { status: 401 }
    );
  }

  if (existing.status === "requested") {
    return NextResponse.json({
      ok: true,
      message: "We already have your request — we'll be in touch.",
    });
  }

  if (existing.source !== "portal" || existing.status !== "otp_verified") {
    return NextResponse.json(
      {
        ok: false,
        message:
          "This email is already in our system. Please check your inbox or contact us on WhatsApp.",
      },
      { status: 409 }
    );
  }

  const requestData = {
    role: parsed.data.role,
    studentName: parsed.data.studentName.trim(),
    studentAge: parsed.data.studentAge.trim(),
    studentPhone: parsed.data.studentPhone.trim(),
    studentEmail: parsed.data.studentEmail?.trim() || undefined,
    parentPhone: parsed.data.parentPhone?.trim() || undefined,
    school: parsed.data.school.trim(),
    city: parsed.data.city.trim(),
    hearAbout: parsed.data.hearAbout,
    referralFrom: parsed.data.referralFrom?.trim() || undefined,
    question: parsed.data.question?.trim() || undefined,
  };

  const referralCode = parsed.data.referralCode?.trim() || undefined;

  // Upgrade the placeholder record from "otp_verified" → "requested"
  await col.updateOne(
    { _id: existing._id },
    {
      $set: {
        name,
        status: "requested",
        reason: requestData.question, // back-compat: surface question as reason in admin list
        requestData,
        ...(referralCode ? { referralCode } : {}),
        requestedAt: new Date(),
      },
    }
  );

  // Clean up the consumed pending OTP
  await otpCol.deleteOne({ email }).catch(() => {});

  // Notify admins (fire-and-forget) — only those who opted in to email updates.
  // receiveEmails is treated as "true" when undefined for back-compat with admins
  // created before this field existed.
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
      await sendNewRequestNotification({
        to: recipients,
        name,
        email,
        city: requestData.city,
        reason: requestData.question,
      });
    } catch (err) {
      console.error("[request-invite] admin notification failed:", err);
    }
  })();

  return NextResponse.json({ ok: true });
}
