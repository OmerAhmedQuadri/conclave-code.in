import { NextResponse } from "next/server";
import { checkStatusSendOtpSchema } from "@/models/check-status";
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

  const parsed = checkStatusSendOtpSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid input";
    return NextResponse.json({ ok: false, message }, { status: 422 });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const inviteeCol = await invitees();
  const invitee = await inviteeCol.findOne({ email });
  if (!invitee) {
    return NextResponse.json(
      { ok: false, message: "We don't have a record for that email." },
      { status: 404 }
    );
  }

  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  const otpCol = await pendingOtps();
  await otpCol.updateOne(
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
  );

  try {
    await sendOtpEmail({ to: email, otp });
  } catch (err) {
    console.error("[check-status/send-otp] mail failed:", err);
    return NextResponse.json(
      { ok: false, message: "Could not send OTP email. Please try again." },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}
