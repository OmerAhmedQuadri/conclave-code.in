import { NextResponse } from "next/server";
import { checkStatusRefreshSchema, type CheckStatusInfo } from "@/models/check-status";
import { invitees } from "@/lib/db";
import { verifyEmailVerificationToken } from "@/lib/verification-token";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request" }, { status: 400 });
  }

  const parsed = checkStatusRefreshSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid input";
    return NextResponse.json({ ok: false, message }, { status: 422 });
  }

  const email = parsed.data.email.trim().toLowerCase();

  if (!verifyEmailVerificationToken(parsed.data.verificationToken, email)) {
    return NextResponse.json(
      { ok: false, message: "Session expired. Please verify your email again." },
      { status: 401 }
    );
  }

  const col = await invitees();
  const invitee = await col.findOne({ email });
  if (!invitee) {
    return NextResponse.json(
      { ok: false, message: "We couldn't find your record." },
      { status: 404 }
    );
  }

  await col.updateOne(
    { _id: invitee._id },
    { $inc: { refreshCount: 1 }, $set: { lastRefreshedAt: new Date() } }
  );

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
  return NextResponse.json({ ok: true, info });
}
