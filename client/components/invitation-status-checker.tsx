"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type {
  CheckStatusInfo,
  CheckStatusResponse,
  CheckStatusRefreshResponse,
} from "@/models/check-status";

export const STATUS_SESSION_KEY = "fec_check_status_session";
type Stored = { email: string; verificationToken: string };

export function saveStatusSession(email: string, verificationToken: string) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(
    STATUS_SESSION_KEY,
    JSON.stringify({ email, verificationToken })
  );
}

export function hasStatusSession(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(window.sessionStorage.getItem(STATUS_SESSION_KEY));
}

type Stage = "email" | "otp" | "status";

interface Props {
  onBack?: () => void;
}

export function InvitationStatusChecker({ onBack }: Props) {
  const [stage, setStage] = useState<Stage>("email");
  const [email, setEmail] = useState("");
  const [info, setInfo] = useState<CheckStatusInfo | null>(null);
  const [verificationToken, setVerificationToken] = useState<string | null>(null);
  const autoRefreshAttempted = useRef(false);

  // Try to resume an existing session — and that auto-refresh counts as a visit
  useEffect(() => {
    if (autoRefreshAttempted.current) return;
    autoRefreshAttempted.current = true;
    if (typeof window === "undefined") return;
    const raw = window.sessionStorage.getItem(STATUS_SESSION_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as Stored;
      if (!parsed.email || !parsed.verificationToken) return;
      void (async () => {
        const res = await fetch("/api/check-status/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsed),
        });
        const json = (await res.json()) as CheckStatusRefreshResponse;
        if (json.ok) {
          setEmail(parsed.email);
          setVerificationToken(parsed.verificationToken);
          setInfo(json.info);
          setStage("status");
        } else {
          window.sessionStorage.removeItem(STATUS_SESSION_KEY);
        }
      })();
    } catch {
      window.sessionStorage.removeItem(STATUS_SESSION_KEY);
    }
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="font-mono text-xs font-bold tracking-[0.25em] text-gold">
          CHECK INVITATION STATUS
        </p>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="font-mono text-[10px] uppercase tracking-[0.2em] text-cream-40 hover:text-gold"
          >
            ← Back
          </button>
        )}
      </div>

      {stage === "email" && (
        <EmailStage
          email={email}
          setEmail={setEmail}
          onSent={() => setStage("otp")}
        />
      )}

      {stage === "otp" && (
        <OtpStage
          email={email}
          onEditEmail={() => setStage("email")}
          onVerified={(t, infoFromServer) => {
            setVerificationToken(t);
            setInfo(infoFromServer);
            window.sessionStorage.setItem(
              STATUS_SESSION_KEY,
              JSON.stringify({ email, verificationToken: t })
            );
            setStage("status");
          }}
        />
      )}

      {stage === "status" && info && verificationToken && (
        <StatusView
          info={info}
          email={email}
          verificationToken={verificationToken}
          onUpdate={setInfo}
          onSignOut={() => {
            window.sessionStorage.removeItem(STATUS_SESSION_KEY);
            setEmail("");
            setInfo(null);
            setVerificationToken(null);
            setStage("email");
          }}
        />
      )}
    </div>
  );
}

function EmailStage({
  email,
  setEmail,
  onSent,
}: {
  email: string;
  setEmail: (v: string) => void;
  onSent: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/check-status/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = (await res.json()) as { ok: boolean; message?: string };
      if (!json.ok) throw new Error(json.message ?? "Could not send OTP");
      onSent();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <p className="text-sm text-cream-70">
        Enter the email you used and we&apos;ll send a 6-digit code so we can show your latest invitation status.
      </p>
      <div className="grid gap-2">
        <Label htmlFor="status-email">Email</Label>
        <Input
          id="status-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
        />
      </div>
      <Button type="submit" size="lg" disabled={submitting} className="w-full">
        {submitting ? "Sending..." : "Send OTP"}
      </Button>
      {error && (
        <p
          className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
          role="alert"
        >
          {error}
        </p>
      )}
    </form>
  );
}

function OtpStage({
  email,
  onEditEmail,
  onVerified,
}: {
  email: string;
  onEditEmail: () => void;
  onVerified: (t: string, info: CheckStatusInfo) => void;
}) {
  const [otp, setOtp] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/check-status/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      const json = (await res.json()) as CheckStatusResponse;
      if (!json.ok) throw new Error(json.message ?? "Could not verify");
      onVerified(json.verificationToken, json.info);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <p className="text-sm text-cream-70">
        We sent a 6-digit code to <span className="text-cream">{email}</span>.{" "}
        <button
          type="button"
          onClick={onEditEmail}
          className="font-mono text-[10px] uppercase tracking-[0.2em] text-cream-40 hover:text-gold"
        >
          Change
        </button>
      </p>
      <div className="grid gap-2">
        <Label htmlFor="status-otp">One-time code</Label>
        <Input
          id="status-otp"
          inputMode="numeric"
          autoComplete="one-time-code"
          required
          pattern="\d{6}"
          maxLength={6}
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
          placeholder="123456"
          className="font-mono tracking-[0.4em]"
        />
      </div>
      <Button
        type="submit"
        size="lg"
        disabled={submitting || otp.length !== 6}
        className="w-full"
      >
        {submitting ? "Verifying..." : "View status"}
      </Button>
      {error && (
        <p
          className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
          role="alert"
        >
          {error}
        </p>
      )}
    </form>
  );
}

const STATUS_DISPLAY: Record<
  CheckStatusInfo["status"],
  { label: string; tone: "neutral" | "good" | "bad" | "pending"; body: string }
> = {
  requested: {
    label: "Pending review",
    tone: "pending",
    body: "Your request is in our review queue. Most invitations go out within 48 hours.",
  },
  invited: {
    label: "Invitation sent",
    tone: "neutral",
    body: "Your invitation has been sent. Open the link in your email to register.",
  },
  registered: {
    label: "Awaiting OTP",
    tone: "neutral",
    body: "Continue verifying your email from your registration link.",
  },
  otp_verified: {
    label: "Awaiting decision",
    tone: "pending",
    body: "Thanks — we have everything we need. We'll let you know shortly.",
  },
  approved: {
    label: "Approved",
    tone: "good",
    body: "You're confirmed for the event. Check your inbox for details.",
  },
  rejected: {
    label: "Not selected",
    tone: "bad",
    body:
      "Unfortunately your request wasn't selected this time. Thank you for your interest.",
  },
};

function StatusView({
  info,
  email,
  verificationToken,
  onUpdate,
  onSignOut,
}: {
  info: CheckStatusInfo;
  email: string;
  verificationToken: string;
  onUpdate: (info: CheckStatusInfo) => void;
  onSignOut: () => void;
}) {
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const display = STATUS_DISPLAY[info.status];

  const onRefresh = async () => {
    setRefreshing(true);
    setError(null);
    try {
      const res = await fetch("/api/check-status/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, verificationToken }),
      });
      const json = (await res.json()) as CheckStatusRefreshResponse;
      if (!json.ok) throw new Error(json.message ?? "Could not refresh");
      onUpdate(json.info);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="space-y-5">
      <div
        className={cn(
          "rounded-md border p-5",
          display.tone === "good" && "border-emerald-500/30 bg-emerald-500/5",
          display.tone === "bad" && "border-destructive/30 bg-destructive/5",
          display.tone === "pending" && "border-gold/40 bg-gold/5",
          display.tone === "neutral" && "border-border bg-card"
        )}
      >
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cream-40">Status</p>
        <p
          className={cn(
            "mt-1 text-lg font-semibold",
            display.tone === "good" && "text-emerald-300",
            display.tone === "bad" && "text-destructive",
            display.tone === "pending" && "text-gold",
            display.tone === "neutral" && "text-cream"
          )}
        >
          {display.label}
        </p>
        <p className="mt-3 text-sm text-cream-70">{display.body}</p>
        {info.registerUrl && (
          <a
            href={info.registerUrl}
            className="mt-4 inline-flex items-center gap-2 rounded-md border border-gold/40 bg-gold/10 px-4 py-2 text-sm text-gold transition-colors hover:bg-gold/15"
          >
            Open registration link →
          </a>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-cream-40">
          Signed in as {info.name ? `${info.name} · ` : ""}
          <span className="text-cream-70">{info.email}</span>
        </p>
        <div className="flex gap-3">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onRefresh}
            disabled={refreshing}
          >
            {refreshing ? "Refreshing..." : "Refresh"}
          </Button>
          <button
            type="button"
            onClick={onSignOut}
            className="font-mono text-[10px] uppercase tracking-[0.2em] text-cream-40 hover:text-gold"
          >
            Sign out
          </button>
        </div>
      </div>

      {error && (
        <p
          className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}
