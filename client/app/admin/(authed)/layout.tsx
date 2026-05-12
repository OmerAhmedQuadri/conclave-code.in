import { redirect } from "next/navigation";
import { getAdminEmail } from "@/lib/admin-auth";
import { AdminHeader } from "@/components/admin-header";

export const dynamic = "force-dynamic";

export default async function AuthedAdminLayout({ children }: { children: React.ReactNode }) {
  const adminEmail = await getAdminEmail();
  if (!adminEmail) redirect("/admin/login");

  return (
    <div className="min-h-screen bg-ink">
      <AdminHeader adminEmail={adminEmail} />
      {children}
    </div>
  );
}
