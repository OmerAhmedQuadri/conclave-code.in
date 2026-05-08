import { NextResponse } from "next/server";
import type { InviteeListItem } from "@/models/invitee";
import { isAdmin } from "@/lib/admin-auth";
import { invitees } from "@/lib/db";
import { processAutoApprovals } from "@/lib/auto-approve";

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  await processAutoApprovals().catch((err) =>
    console.error("[invitees] auto-approve failed:", err)
  );

  const col = await invitees();
  const docs = await col
    .find({}, { projection: { otp: 0, otpExpiresAt: 0, otpAttempts: 0 } })
    .sort({ invitedAt: -1 })
    .toArray();

  const list: InviteeListItem[] = docs.map((d) => ({
    id: d._id?.toString(),
    email: d.email,
    originalEmail: d.originalEmail,
    name: d.name,
    status: d.status,
    source: d.source,
    token: d.token,
    reason: d.reason,
    invitedBy: d.invitedBy,
    decidedBy: d.decidedBy,
    requestedAt: d.requestedAt,
    invitedAt: d.invitedAt,
    registeredAt: d.registeredAt,
    verifiedAt: d.verifiedAt,
    decidedAt: d.decidedAt,
    autoApproveMode: d.autoApproveMode,
    autoApproveAfter: d.autoApproveAfter,
    refreshCount: d.refreshCount,
    lastRefreshedAt: d.lastRefreshedAt,
    referralCode: d.referralCode,
    formData: d.formData,
    requestData: d.requestData,
  }));

  return NextResponse.json({ ok: true, invitees: list });
}
