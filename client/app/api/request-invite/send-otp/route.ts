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

  // Send the OTP and write the placeholder invitee concurrently. The placeholder
  // doesn't depend on the email going through, and we don't want to make the
  // user wait for two sequential operations.
  const inviteePromise: Promise<unknown> = (() => {
    if (!existing) {
      return inviteeCol.insertOne({
        email,
        name,
        token: generateInviteToken(),
        status: "otp_verified",
        source: "portal",
        requestedAt: new Date(),
      });
    }
    if (existing.source === "portal" && existing.status === "otp_verified") {
      return inviteeCol.updateOne(
        { _id: existing._id },
        { $set: { name: name || existing.name } }
      );
    }
    return Promise.resolve();
  })();

  try {
    const [mailResult] = await Promise.allSettled([
      sendOtpEmail({ to: email, otp }),
      inviteePromise,
    ]);
    if (mailResult.status === "rejected") {
      console.error("[request-invite/send-otp] mail failed:", mailResult.reason);
      return NextResponse.json(
        { ok: false, message: "Could not send OTP email. Please try again." },
        { status: 502 }
      );
    }
  } catch (err) {
    console.error("[request-invite/send-otp] failed:", err);
    return NextResponse.json(
      { ok: false, message: "Could not send OTP. Please try again." },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}
