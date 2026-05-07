import { invitees, type InviteeDoc } from "@/lib/db";
import { AdminDashboard, type InviteeRow } from "@/components/admin-dashboard";
import { processAutoApprovals } from "@/lib/auto-approve";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  // Run any due auto-approvals before reading the list
  await processAutoApprovals().catch((err) =>
    console.error("[dashboard] auto-approve failed:", err)
  );

  const col = await invitees();
  const docs = await col
    .find({}, { projection: { otp: 0, otpExpiresAt: 0, otpAttempts: 0 } })
    .sort({ requestedAt: -1, invitedAt: -1 })
    .toArray();

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
    autoApprove: d.autoApprove,
    autoApproveAfter: d.autoApproveAfter?.toISOString(),
    refreshCount: d.refreshCount,
    lastRefreshedAt: d.lastRefreshedAt?.toISOString(),
    referralCode: d.referralCode,
    formData: d.formData,
    requestData: d.requestData,
  }));

  return <AdminDashboard initialRows={rows} />;
}
