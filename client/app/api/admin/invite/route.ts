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
  const col = await invitees();

  const existing = await col.findOne({ email });

  // If a "requested" row exists, upgrade it to "invited" (reuse the token).
  if (existing && existing.status === "requested") {
    const origin = request.headers.get("origin") ?? new URL(request.url).origin;
    const inviteUrl = `${origin}/register/${existing.token}`;
    try {
      await sendInviteEmail({ to: email, name: existing.name ?? name, inviteUrl });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to send email";
      return NextResponse.json({ ok: false, message }, { status: 502 });
    }
    await col.updateOne(
      { _id: existing._id },
      {
        $set: {
          status: "invited",
          invitedBy: adminEmail,
          invitedAt: new Date(),
          ...(name && !existing.name ? { name } : {}),
        },
      }
    );
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
    invitedBy: adminEmail,
    invitedAt: new Date(),
  });

  const origin = request.headers.get("origin") ?? new URL(request.url).origin;
  const inviteUrl = `${origin}/register/${token}`;

  try {
    await sendInviteEmail({ to: email, name, inviteUrl });
  } catch (err) {
    await col.deleteOne({ token });
    const message = err instanceof Error ? err.message : "Failed to send email";
    return NextResponse.json({ ok: false, message }, { status: 502 });
  }

  return NextResponse.json({ ok: true, inviteUrl });
}
