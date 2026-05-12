import { NextResponse } from "next/server";
import type { InviteeListItem } from "@/models/invitee";
import { isAdmin } from "@/lib/admin-auth";
import { invitees, volunteers } from "@/lib/db";
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

  // Build a name lookup for any volunteers referenced in the list
  const volIds = Array.from(
    new Set(
      docs
        .map((d) => d.assignedVolunteerId?.toString())
        .filter((v): v is string => Boolean(v))
    )
  );
  const volMap = new Map<string, string>();
  if (volIds.length > 0) {
    const volCol = await volunteers();
    const volDocs = await volCol
      .find(
        { _id: { $in: docs.map((d) => d.assignedVolunteerId).filter(Boolean) as never } },
        { projection: { name: 1 } }
      )
      .toArray();
    for (const v of volDocs) volMap.set(v._id?.toString() ?? "", v.name);
  }

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
    assignedVolunteerId: d.assignedVolunteerId?.toString(),
    assignedVolunteerName: d.assignedVolunteerId
      ? volMap.get(d.assignedVolunteerId.toString())
      : undefined,
    formData: d.formData,
    requestData: d.requestData,
  }));

  return NextResponse.json({ ok: true, invitees: list });
}
