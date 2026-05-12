import Link from "next/link";
import { redirect } from "next/navigation";
import { CodeInLogo } from "@/components/codein-logo";
import { getCurrentVolunteer } from "@/lib/volunteer-auth";
import { VolunteerLogoutButton } from "@/components/volunteer-logout";
import { ThemeToggle } from "@/components/theme-toggle";

export const dynamic = "force-dynamic";

export default async function AuthedVolunteerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const me = await getCurrentVolunteer();
  if (!me) redirect("/volunteer/login");

  return (
    <div className="min-h-screen bg-ink">
      <header className="border-b border-border">
        <div className="container flex max-w-6xl flex-wrap items-center justify-between gap-y-3 py-4">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <Link href="/volunteer/dashboard" className="flex items-center gap-3">
              <CodeInLogo height={22} />
              <span className="font-mono text-[10px] font-bold tracking-[0.25em] text-cream-40">
                · VOLUNTEER
              </span>
            </Link>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span
              className="hidden max-w-[200px] truncate text-cream-40 sm:inline lg:max-w-none"
              title={me.email}
            >
              {me.name} · {me.email}
            </span>
            <ThemeToggle />
            <VolunteerLogoutButton />
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
