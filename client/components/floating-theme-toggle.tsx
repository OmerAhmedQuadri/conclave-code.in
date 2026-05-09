"use client";

import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";

/**
 * Renders the theme toggle as a fixed top-right pill on every public page.
 * Hidden on /admin/* routes since the admin layout already has a toggle in
 * its header.
 */
export function FloatingThemeToggle() {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return null;
  return (
    <div className="fixed right-4 top-4 z-50">
      <ThemeToggle />
    </div>
  );
}
