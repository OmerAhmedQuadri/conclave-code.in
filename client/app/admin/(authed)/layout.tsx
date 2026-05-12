import Link from "next/link";
import { redirect } from "next/navigation";
import { CodeInLogo } from "@/components/codein-logo";
import { getAdminEmail } from "@/lib/admin-auth";
import { LogoutButton } from "@/components/admin-logout";
import { ThemeToggle } from "@/components/theme-toggle";

export const dynamic = "force-dynamic";

export default async function AuthedAdminLayout({ children }: { children: React.ReactNode }) {
  const adminEmail = await getAdminEmail();
  if (!adminEmail) redirect("/admin/login");

  return (
    <div className="min-h-screen bg-ink">
      <header className="border-b border-border">
        <div className="container flex max-w-6xl flex-wrap items-center justify-between gap-y-3 py-4">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <Link href="/admin" className="flex items-center gap-3">
              <CodeInLogo height={22} />
              <span className="font-mono text-[10px] font-bold tracking-[0.25em] text-cream-40">
                · ADMIN
              </span>
            </Link>
            <nav className="flex flex-wrap gap-x-7 gap-y-1 font-mono text-xs tracking-[0.2em] text-cream-70">
              <Link href="/admin/dashboard" className="transition-colors hover:text-gold">
                DASHBOARD
              </Link>
              <Link href="/admin/volunteers" className="transition-colors hover:text-gold">
                VOLUNTEERS
              </Link>
              <Link href="/admin/schools" className="transition-colors hover:text-gold">
                SCHOOLS
              </Link>
              <Link href="/admin/admins" className="transition-colors hover:text-gold">
                ADMINS
              </Link>
            </nav>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span
              className="hidden max-w-[180px] truncate text-cream-40 sm:inline lg:max-w-none"
              title={adminEmail}
            >
              {adminEmail}
            </span>
            <ThemeToggle />
            <LogoutButton />
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
