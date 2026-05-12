import { invitees, type InviteeDoc, volunteers } from "@/lib/db";
import { AdminDashboard, type InviteeRow } from "@/components/admin-dashboard";
import { processAutoApprovals } from "@/lib/auto-approve";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  await processAutoApprovals().catch((err) =>
    console.error("[dashboard] auto-approve failed:", err)
  );

  const col = await invitees();
  const docs = await col
    .find({}, { projection: { otp: 0, otpExpiresAt: 0, otpAttempts: 0 } })
    .sort({ requestedAt: -1, invitedAt: -1 })
    .toArray();

  // Resolve volunteer names for any assigned invitees
  const volIds = docs
    .map((d) => d.assignedVolunteerId)
    .filter((v): v is NonNullable<typeof v> => Boolean(v));
  const volMap = new Map<string, string>();
  if (volIds.length > 0) {
    const volCol = await volunteers();
    const volDocs = await volCol
      .find({ _id: { $in: volIds } }, { projection: { name: 1 } })
      .toArray();
    for (const v of volDocs) volMap.set(v._id?.toString() ?? "", v.name);
  }

  const rows: InviteeRow[] = docs.map((d: InviteeDoc) => ({
    id: d._id?.toString() ?? "",
    email: d.email,
    originalEmail: d.originalEmail,
    name: d.name,
    status: d.status,
    source: d.source,
    token: d.token,
    reason: d.reason,
    invitedBy: d.invitedBy,
    decidedBy: d.decidedBy,
    requestedAt: d.requestedAt?.toISOString(),
    invitedAt: d.invitedAt?.toISOString(),
    registeredAt: d.registeredAt?.toISOString(),
    verifiedAt: d.verifiedAt?.toISOString(),
    decidedAt: d.decidedAt?.toISOString(),
    autoApproveMode: d.autoApproveMode,
    autoApproveAfter: d.autoApproveAfter?.toISOString(),
    refreshCount: d.refreshCount,
    lastRefreshedAt: d.lastRefreshedAt?.toISOString(),
    referralCode: d.referralCode,
    assignedVolunteerId: d.assignedVolunteerId?.toString(),
    assignedVolunteerName: d.assignedVolunteerId
      ? volMap.get(d.assignedVolunteerId.toString())
      : undefined,
    attendedAt: d.attendedAt?.toISOString(),
    attendedByName: d.attendedByName,
    formData: d.formData,
    requestData: d.requestData,
  }));

  return <AdminDashboard initialRows={rows} />;
}
