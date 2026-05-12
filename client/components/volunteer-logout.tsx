"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function VolunteerLogoutButton() {
  const router = useRouter();
  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={async () => {
        await fetch("/api/volunteer/logout", { method: "POST" });
        router.replace("/volunteer/login");
      }}
    >
      Logout
    </Button>
  );
}
