import { NextResponse } from "next/server";
import { decideSchema } from "@/models/decide";
import { getAdminEmail } from "@/lib/admin-auth";
import { invitees } from "@/lib/db";
import { sendConfirmationEmail } from "@/lib/mailer";

export async function POST(request: Request) {
  const adminEmail = await getAdminEmail();
  if (!adminEmail) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request" }, { status: 400 });
  }

  const parsed = decideSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "Invalid payload" }, { status: 422 });
  }

  const col = await invitees();
  const doc = await col.findOne({ token: parsed.data.token });
  if (!doc) {
    return NextResponse.json({ ok: false, message: "Invitee not found" }, { status: 404 });
  }
  // Decide is allowed when the user has provided enough info:
  // - Portal flow: status "requested" (the user submitted the full form)
  // - Admin-invite flow: status "otp_verified" (user registered + verified OTP)
  // Portal "otp_verified" is an incomplete request — no requestData yet — so reject.
  const isDecidable =
    doc.status === "requested" ||
    (doc.status === "otp_verified" && doc.source !== "portal");
  if (!isDecidable) {
    return NextResponse.json(
      { ok: false, message: `Cannot decide on status "${doc.status}"` },
      { status: 409 }
    );
  }

  const newStatus = parsed.data.decision === "approve" ? "approved" : "rejected";
  await col.updateOne(
    { token: parsed.data.token },
    { $set: { status: newStatus, decidedAt: new Date(), decidedBy: adminEmail } }
  );

  if (newStatus === "approved") {
    try {
      await sendConfirmationEmail({ to: doc.email, name: doc.name });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Approved but email failed";
      return NextResponse.json({ ok: true, warning: message });
    }
  }

  return NextResponse.json({ ok: true, status: newStatus });
}
