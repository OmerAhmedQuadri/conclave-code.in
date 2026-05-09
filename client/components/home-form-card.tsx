"use client";

import { useRouter } from "next/navigation";
import { RequestInviteForm } from "@/components/request-invite-form";

interface Props {
  requestLabel: string;
  requestTitle: string;
  requestIntro: string;
}

export function HomeFormCard({ requestLabel, requestTitle, requestIntro }: Props) {
  const router = useRouter();

  return (
    <div className="rounded-lg border border-border bg-card/40 p-6 md:p-8">
      <p className="font-mono text-xs font-bold tracking-[0.25em] text-gold">{requestLabel}</p>
      <h2 className="mt-2 font-heading text-2xl font-bold leading-tight text-cream md:text-3xl">
        {requestTitle}
      </h2>
      <p className="mt-3 font-sans text-sm text-cream-70">{requestIntro}</p>
      <div className="mt-6">
        <RequestInviteForm onCheckStatus={() => router.push("/check-status")} />
      </div>
    </div>
  );
}
