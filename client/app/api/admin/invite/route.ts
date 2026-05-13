import { NextResponse } from "next/server";
import { inviteSchema } from "@/models/invite";
import { getAdminEmail } from "@/lib/admin-auth";
import { invitees } from "@/lib/db";
import { generateInviteToken } from "@/lib/tokens";
import { sendInviteEmail } from "@/lib/mailer";

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

  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "Email is required" }, { status: 422 });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const name = parsed.data.name?.trim() || undefined;
  const autoApproveMode = parsed.data.autoApproveMode ?? "never";
  const col = await invitees();

  const existing = await col.findOne({ email });

  const origin = request.headers.get("origin") ?? new URL(request.url).origin;

  // If a "requested" row exists, upgrade it to "invited" (reuse the token).
  if (existing && existing.status === "requested") {
    const inviteUrl = `${origin}/register/${existing.token}`;

    // Run the DB update + the SMTP send in parallel. The user (admin) doesn't
    // need to wait for SMTP to ACK before we report success — we surface a
    // warning if the email fails so they can resend, but the row state is
    // already correct.
    const [, mailResult] = await Promise.allSettled([
      col.updateOne(
        { _id: existing._id },
        {
          $set: {
            status: "invited",
            source: "admin",
            invitedBy: adminEmail,
            invitedAt: new Date(),
            autoApproveMode,
            ...(name && !existing.name ? { name } : {}),
          },
        }
      ),
      sendInviteEmail({ to: email, name: existing.name ?? name, inviteUrl }),
    ]);
    if (mailResult.status === "rejected") {
      console.error("[admin/invite] mail failed (upgrade):", mailResult.reason);
      return NextResponse.json({
        ok: true,
        inviteUrl,
        upgraded: true,
        warning: "Invitation row upgraded but the email could not be sent. Try again from the row.",
      });
    }
    return NextResponse.json({ ok: true, inviteUrl, upgraded: true });
  }

  if (existing) {
    return NextResponse.json(
      { ok: false, message: `Already in system (${existing.status})` },
      { status: 409 }
    );
  }

  const token = generateInviteToken();
  await col.insertOne({
    email,
    name,
    token,
    status: "invited",
    source: "admin",
    invitedBy: adminEmail,
    invitedAt: new Date(),
    autoApproveMode,
  });

  const inviteUrl = `${origin}/register/${token}`;

  try {
    await sendInviteEmail({ to: email, name, inviteUrl });
  } catch (err) {
    // Keep the invitee around but mark via a warning — admin can resend
    // rather than losing the row entirely.
    console.error("[admin/invite] mail failed:", err);
    return NextResponse.json({
      ok: true,
      inviteUrl,
      warning:
        "Invitee saved but the email could not be sent. Click the row to resend, or check SMTP.",
    });
  }

  return NextResponse.json({ ok: true, inviteUrl });
}
