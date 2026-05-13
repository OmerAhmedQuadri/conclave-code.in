import { NextResponse } from "next/server";
import { registerSendOtpSchema } from "@/models/register";
import { invitees, pendingOtps } from "@/lib/db";
import { generateOtp, OTP_TTL_MS } from "@/lib/tokens";
import { sendOtpEmail } from "@/lib/mailer";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request" }, { status: 400 });
  }

  const parsed = registerSendOtpSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid input";
    return NextResponse.json({ ok: false, message }, { status: 422 });
  }

  const token = parsed.data.token;
  const email = parsed.data.email.trim().toLowerCase();

  const inviteeCol = await invitees();
  const invitee = await inviteeCol.findOne({ token });
  if (!invitee) {
    return NextResponse.json({ ok: false, message: "Invitation not found" }, { status: 404 });
  }
  if (invitee.status === "approved" || invitee.status === "rejected") {
    return NextResponse.json(
      { ok: false, message: "This invitation has already been finalised" },
      { status: 409 }
    );
  }

  // If user is changing email, ensure the new email isn't already attached to a
  // different invitee (the email field is uniquely indexed).
  if (email !== invitee.email.toLowerCase()) {
    const clash = await inviteeCol.findOne({ email, token: { $ne: token } });
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

  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  const otpCol = await pendingOtps();
  // Write the pending OTP and send the email concurrently — neither depends on the other.
  const [, mailResult] = await Promise.allSettled([
    otpCol.updateOne(
      { email },
      {
        $set: {
          email,
          name: invitee.name ?? "",
          otp,
          expiresAt,
          attempts: 0,
          verifiedAt: undefined,
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    ),
    sendOtpEmail({ to: email, otp }),
  ]);
  if (mailResult.status === "rejected") {
    console.error("[register/send-otp] mail failed:", mailResult.reason);
    return NextResponse.json(
      { ok: false, message: "Could not send OTP email. Please try again." },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}
