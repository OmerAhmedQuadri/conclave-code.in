"use client";

import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";

/**
 * Renders the theme toggle as a fixed top-right pill on every public page.
 * Hidden on /admin/* and /volunteer/* routes since those layouts already
 * have a toggle in their own header.
 */
export function FloatingThemeToggle() {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin") || pathname?.startsWith("/volunteer")) return null;
  return (
    <div className="fixed right-4 top-4 z-50">
      <ThemeToggle />
    </div>
  );
}
