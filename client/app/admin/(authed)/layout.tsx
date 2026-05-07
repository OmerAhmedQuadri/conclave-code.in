import Link from "next/link";
import { redirect } from "next/navigation";
import { CodeInLogo } from "@/components/codein-logo";
import { getAdminEmail } from "@/lib/admin-auth";
import { LogoutButton } from "@/components/admin-logout";

export const dynamic = "force-dynamic";

export default async function AuthedAdminLayout({ children }: { children: React.ReactNode }) {
  const adminEmail = await getAdminEmail();
  if (!adminEmail) redirect("/admin/login");

  return (
    <div className="min-h-screen bg-ink">
      <header className="border-b border-border">
        <div className="container flex max-w-5xl items-center justify-between py-5">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="flex items-center gap-3">
              <CodeInLogo height={22} />
              <span className="font-mono text-[10px] font-bold tracking-[0.25em] text-cream-40">
                · ADMIN
              </span>
            </Link>
            <nav className="flex gap-4 font-mono text-xs tracking-[0.2em] text-cream-70">
              <Link href="/admin/dashboard" className="transition-colors hover:text-gold">
                DASHBOARD
              </Link>
              <Link href="/admin/admins" className="transition-colors hover:text-gold">
                ADMINS
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="hidden text-cream-40 sm:inline">{adminEmail}</span>
            <LogoutButton />
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
