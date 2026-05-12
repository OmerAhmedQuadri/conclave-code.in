"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { CodeInLogo } from "@/components/codein-logo";
import { LogoutButton } from "@/components/admin-logout";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin/dashboard", label: "DASHBOARD" },
  { href: "/admin/volunteers", label: "VOLUNTEERS" },
  { href: "/admin/schools", label: "SCHOOLS" },
  { href: "/admin/admins", label: "ADMINS" },
];

export function AdminHeader({ adminEmail }: { adminEmail: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close menu on navigation
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock body scroll while the mobile drawer is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <header className="relative z-30 border-b border-border bg-ink">
      <div className="container flex max-w-6xl items-center justify-between gap-3 py-4">
        {/* Left: logo + desktop nav */}
        <div className="flex min-w-0 items-center gap-x-7">
          <Link href="/admin" className="flex items-center gap-3">
            <CodeInLogo height={22} />
            <span className="font-mono text-[10px] font-bold tracking-[0.25em] text-cream-40">
              · ADMIN
            </span>
          </Link>
          <nav className="hidden gap-x-7 font-mono text-xs tracking-[0.2em] text-cream-70 md:flex">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "transition-colors hover:text-gold",
                  pathname?.startsWith(item.href) && "text-gold"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Right: email (desktop) + theme + logout + hamburger (mobile) */}
        <div className="flex items-center gap-2 text-sm md:gap-3">
          <span
            className="hidden max-w-[200px] truncate text-cream-40 lg:inline lg:max-w-none"
            title={adminEmail}
          >
            {adminEmail}
          </span>
          <ThemeToggle />
          <div className="hidden md:block">
            <LogoutButton />
          </div>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-cream-70 transition-colors hover:border-gold/40 hover:text-gold md:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {open && (
        <>
          <div
            className="fixed inset-0 top-[57px] z-30 bg-ink/80 backdrop-blur-sm md:hidden"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 right-0 top-full z-40 border-b border-border bg-ink shadow-lg md:hidden">
            <nav className="container max-w-6xl py-2">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "block px-2 py-3 font-mono text-xs tracking-[0.2em] transition-colors hover:text-gold",
                    pathname?.startsWith(item.href) ? "text-gold" : "text-cream-70"
                  )}
                >
                  {item.label}
                </Link>
              ))}
              <div className="mt-1 flex items-center justify-between border-t border-border px-2 py-3">
                <span className="truncate text-xs text-cream-40" title={adminEmail}>
                  {adminEmail}
                </span>
                <LogoutButton />
              </div>
            </nav>
          </div>
        </>
      )}
    </header>
  );
}
