"use client";

import { useEffect, useState } from "react";
import { RequestInviteForm } from "@/components/request-invite-form";
import {
  InvitationStatusChecker,
  hasStatusSession,
} from "@/components/invitation-status-checker";

type Mode = "request" | "status";

interface Props {
  requestLabel: string;
  requestTitle: string;
  requestIntro: string;
}

export function HomeFormCard({ requestLabel, requestTitle, requestIntro }: Props) {
  const [mode, setMode] = useState<Mode>("request");

  // If a previous session is still in sessionStorage, jump straight to the
  // status checker on mount so the user stays "logged in".
  useEffect(() => {
    if (hasStatusSession()) setMode("status");
  }, []);

  return (
    <div className="rounded-lg border border-border bg-card/40 p-6 md:p-8">
      {mode === "request" ? (
        <>
          <p className="font-mono text-xs font-bold tracking-[0.25em] text-gold">{requestLabel}</p>
          <h2 className="mt-2 font-heading text-2xl font-bold leading-tight text-cream md:text-3xl">
            {requestTitle}
          </h2>
          <p className="mt-3 font-sans text-sm text-cream-70">{requestIntro}</p>
          <div className="mt-6">
            <RequestInviteForm onLoggedIn={() => setMode("status")} />
          </div>
          <div className="mt-6 border-t border-border pt-4 text-center">
            <button
              type="button"
              onClick={() => setMode("status")}
              className="font-mono text-xs uppercase tracking-[0.2em] text-cream-40 transition-colors hover:text-gold"
            >
              Already submitted? Check invitation status →
            </button>
          </div>
        </>
      ) : (
        <InvitationStatusChecker onBack={() => setMode("request")} />
      )}
    </div>
  );
}
