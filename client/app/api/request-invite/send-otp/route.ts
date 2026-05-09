import { NextResponse } from "next/server";
import { sendInviteOtpSchema } from "@/models/request-invite";
import { invitees, pendingOtps } from "@/lib/db";
import { generateInviteToken, generateOtp, OTP_TTL_MS } from "@/lib/tokens";
import { sendOtpEmail } from "@/lib/mailer";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request" }, { status: 400 });
  }

  const parsed = sendInviteOtpSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid input";
    return NextResponse.json({ ok: false, message }, { status: 422 });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const name = parsed.data.name.trim();

  // Block if email is already in our system in a way that should not request again.
  // Exception: portal users with status "otp_verified" (incomplete requests) can
  // resume — re-issue an OTP so they can complete the form.
  const inviteeCol = await invitees();
  const existing = await inviteeCol.findOne({ email });
  if (existing && existing.status !== "rejected") {
    const isResumable = existing.source === "portal" && existing.status === "otp_verified";
    if (!isResumable) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "This email is already in our system. Please check your inbox or contact us on WhatsApp.",
        },
        { status: 409 }
      );
    }
  }

  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  const col = await pendingOtps();
  await col.updateOne(
    { email },
    {
      $set: {
        email,
        name,
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
    console.error("[request-invite/send-otp] mail failed:", err);
    return NextResponse.json(
      { ok: false, message: "Could not send OTP email. Please try again." },
      { status: 502 }
    );
  }

  // Create a placeholder "incomplete" invitee record on first contact so admins
  // can see users who entered their email but never completed the flow.
  // verifiedAt stays unset until they actually verify the OTP.
  if (!existing) {
    await inviteeCol.insertOne({
      email,
      name,
      token: generateInviteToken(),
      status: "otp_verified",
      source: "portal",
      requestedAt: new Date(),
    });
  } else if (existing.source === "portal" && existing.status === "otp_verified") {
    // Resume — keep the same record, just refresh the latest provided name
    await inviteeCol.updateOne(
      { _id: existing._id },
      { $set: { name: name || existing.name } }
    );
  }

  return NextResponse.json({ ok: true });
}
