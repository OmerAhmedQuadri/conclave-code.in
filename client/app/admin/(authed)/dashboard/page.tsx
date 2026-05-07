import { invitees, type InviteeDoc } from "@/lib/db";
import { AdminDashboard, type InviteeRow } from "@/components/admin-dashboard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const col = await invitees();
  const docs = await col
    .find({}, { projection: { otp: 0, otpExpiresAt: 0, otpAttempts: 0 } })
    .sort({ requestedAt: -1, invitedAt: -1 })
    .toArray();

  const rows: InviteeRow[] = docs.map((d: InviteeDoc) => ({
    id: d._id?.toString() ?? "",
    email: d.email,
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
    formData: d.formData,
  }));

  return <AdminDashboard initialRows={rows} />;
}
