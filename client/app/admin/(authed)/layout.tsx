import Link from "next/link";
import { redirect } from "next/navigation";
import { CodeInLogo } from "@/components/codein-logo";
import { getAdminEmail } from "@/lib/admin-auth";
import { LogoutButton } from "@/components/admin-logout";

export const dynamic = "force-dynamic";

export default async function AuthedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const adminEmail = await getAdminEmail();
  if (!adminEmail) redirect("/admin/login");

  return (
    <div className="min-h-screen bg-ink">
      <header className="border-b border-border">
        <div className="container max-w-5xl flex items-center justify-between py-5">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="flex items-center gap-3">
              <CodeInLogo height={22} />
              <span className="font-mono text-[10px] font-bold tracking-[0.25em] text-cream-40">
                · ADMIN
              </span>
            </Link>
            <nav className="flex gap-4 font-mono text-xs tracking-[0.2em] text-cream-70">
              <Link href="/admin" className="hover:text-gold transition-colors">
                INVITEES
              </Link>
              <Link href="/admin/admins" className="hover:text-gold transition-colors">
                ADMINS
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-cream-40 hidden sm:inline">{adminEmail}</span>
            <LogoutButton />
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
