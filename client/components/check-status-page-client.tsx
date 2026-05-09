"use client";

import { useRouter } from "next/navigation";
import { InvitationStatusChecker } from "@/components/invitation-status-checker";

export function CheckStatusPageClient() {
  const router = useRouter();
  return <InvitationStatusChecker onBack={() => router.push("/")} />;
}
