import { getAdminEmail } from "@/lib/admin-auth";
import { admins, type AdminDoc } from "@/lib/db";
import { AdminsManager, type AdminRow } from "@/components/admins-manager";

export const dynamic = "force-dynamic";

export default async function AdminsPage() {
  const me = await getAdminEmail();
  const col = await admins();
  const docs = await col
    .find({}, { projection: { passwordHash: 0 } })
    .sort({ createdAt: -1 })
    .toArray();

  const bootstrapEmail = process.env.ADMIN_EMAIL?.toLowerCase() ?? null;
  const rows: AdminRow[] = docs.map((d: Omit<AdminDoc, "passwordHash">) => ({
    id: d._id?.toString() ?? "",
    email: d.email,
    createdAt: d.createdAt?.toISOString(),
    createdBy: d.createdBy,
  }));

  return <AdminsManager me={me ?? ""} bootstrapEmail={bootstrapEmail} initialRows={rows} />;
}
