import { NextResponse } from "next/server";
import { z } from "zod";
import { autoApproveModes } from "@/models/invitee";
import { getAdminEmail } from "@/lib/admin-auth";
import { invitees } from "@/lib/db";
import { generateInviteToken } from "@/lib/tokens";
import { sendInviteEmail } from "@/lib/mailer";

const inviteRowSchema = z.object({
  email: z.string().email(),
  name: z.string().max(80).optional().or(z.literal("")),
  autoApproveMode: z.enum(autoApproveModes).optional(),
});

const bulkSchema = z.object({
  invites: z.array(inviteRowSchema).min(1).max(200),
});

interface RowResult {
  email: string;
  ok: boolean;
  message?: string;
  upgraded?: boolean;
}

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

  const parsed = bulkSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid input";
    return NextResponse.json({ ok: false, message }, { status: 422 });
  }

  const col = await invitees();
  const origin = request.headers.get("origin") ?? new URL(request.url).origin;
  const results: RowResult[] = [];

  // De-dupe within the file by email (last entry wins)
  const seen = new Map<string, (typeof parsed.data.invites)[number]>();
  for (const row of parsed.data.invites) {
    seen.set(row.email.trim().toLowerCase(), row);
  }

  for (const row of seen.values()) {
    const email = row.email.trim().toLowerCase();
    const name = row.name?.trim() || undefined;
    const autoApproveMode = row.autoApproveMode ?? "never";

    try {
      const existing = await col.findOne({ email });

      // Upgrade a portal "requested" row → invited (mirrors single invite logic)
      if (existing && existing.status === "requested") {
        const inviteUrl = `${origin}/register/${existing.token}`;
        await sendInviteEmail({ to: email, name: existing.name ?? name, inviteUrl });
        await col.updateOne(
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
        );
        results.push({ email, ok: true, upgraded: true });
        continue;
      }

      if (existing) {
        results.push({ email, ok: false, message: `Already in system (${existing.status})` });
        continue;
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
        results.push({ email, ok: true });
      } catch (err) {
        // Roll back the insert if email failed so the user can retry
        await col.deleteOne({ token });
        const message = err instanceof Error ? err.message : "Failed to send email";
        results.push({ email, ok: false, message });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      results.push({ email, ok: false, message });
    }
  }

  const sent = results.filter((r) => r.ok).length;
  const failed = results.length - sent;
  return NextResponse.json({ ok: true, sent, failed, results });
}
