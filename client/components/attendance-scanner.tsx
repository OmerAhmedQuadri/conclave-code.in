"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface LookupOk {
  ok: true;
  invitee: {
    token: string;
    email: string;
    name?: string;
    status: string;
    role?: "student" | "parent";
    studentName?: string;
    school?: string;
    city?: string;
    attendedAt: string | null;
    attendedByName: string | null;
  };
}
interface LookupFail {
  ok: false;
  message?: string;
}
type LookupResponse = LookupOk | LookupFail;

interface MarkResponseOk {
  ok: true;
  invitee: { id: string; email: string; name?: string; attendedAt: string };
}
interface MarkResponseFail {
  ok: false;
  alreadyAttended?: boolean;
  message?: string;
  invitee?: { email: string; name?: string; attendedAt?: string; attendedByName?: string | null };
}
type MarkResponse = MarkResponseOk | MarkResponseFail;

type ResultBanner =
  | { kind: "success"; title: string; subtitle?: string }
  | { kind: "warning"; title: string; subtitle?: string }
  | { kind: "error"; title: string; subtitle?: string }
  | null;

export function AttendanceScanner() {
  const router = useRouter();
  const [manualToken, setManualToken] = useState("");
  const [pending, setPending] = useState<LookupOk["invitee"] | null>(null);
  const [looking, setLooking] = useState(false);
  const [marking, setMarking] = useState(false);
  const [result, setResult] = useState<ResultBanner>(null);

  const isSecure =
    typeof window === "undefined" ||
    window.isSecureContext ||
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";

  const openScanner = () => {
    router.push("/volunteer/attendance/scan");
  };

  const lookupManual = async (raw: string) => {
    setLooking(true);
    setResult(null);
    try {
      const res = await fetch(
        `/api/volunteer/attendance/lookup?token=${encodeURIComponent(raw)}`
      );
      const json = (await res.json()) as LookupResponse;
      if (!json.ok) {
        setResult({ kind: "error", title: json.message ?? "Could not look up this token." });
        return;
      }
      if (json.invitee.attendedAt) {
        setResult({
          kind: "warning",
          title: `Already checked in${
            json.invitee.attendedByName ? ` by ${json.invitee.attendedByName}` : ""
          }`,
          subtitle: json.invitee.name ?? json.invitee.email,
        });
        return;
      }
      if (json.invitee.status !== "approved") {
        setResult({
          kind: "warning",
          title: `Not on the approved list (status: ${json.invitee.status})`,
          subtitle: json.invitee.email,
        });
        return;
      }
      setPending(json.invitee);
    } catch (err) {
      setResult({
        kind: "error",
        title: err instanceof Error ? err.message : "Something went wrong",
      });
    } finally {
      setLooking(false);
    }
  };

  const confirmMark = async () => {
    if (!pending) return;
    setMarking(true);
    try {
      const res = await fetch("/api/volunteer/attendance/mark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: pending.token }),
      });
      const json = (await res.json()) as MarkResponse;
      if (json.ok) {
        const display = json.invitee.name ?? json.invitee.email;
        setResult({ kind: "success", title: `Checked in: ${display}`, subtitle: json.invitee.email });
      } else if (json.alreadyAttended) {
        setResult({
          kind: "warning",
          title: json.message ?? "Already checked in.",
          subtitle: json.invitee?.email,
        });
      } else {
        setResult({
          kind: "error",
          title: json.message ?? "Could not check in.",
          subtitle: json.invitee?.email,
        });
      }
    } catch (err) {
      setResult({
        kind: "error",
        title: err instanceof Error ? err.message : "Something went wrong",
      });
    } finally {
      setMarking(false);
      setPending(null);
      setManualToken("");
    }
  };

  const cancelMark = () => {
    setPending(null);
  };

  const onManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualToken.trim()) return;
    await lookupManual(manualToken.trim());
  };

  // Auto-dismiss banner after 5s
  useEffect(() => {
    if (!result) return;
    const t = setTimeout(() => setResult(null), 5000);
    return () => clearTimeout(t);
  }, [result]);

  return (
    <div className="space-y-6">
      <div className="rounded-md border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-xs font-bold tracking-[0.25em] text-gold">SCAN QR</p>
            <p className="mt-1 text-sm text-cream-70">
              Opens the camera scanner on a dedicated page. Each scan asks for confirmation before
              check-in.
            </p>
          </div>
          <Button size="sm" onClick={openScanner}>
            Start scanner
          </Button>
        </div>

        {!isSecure && (
          <p className="mt-3 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
            Cameras only work on <strong>https://</strong> (or localhost). Open this page over a
            secure connection if the scanner doesn&rsquo;t start.
          </p>
        )}
      </div>

      {result && (
        <div
          className={cn(
            "rounded-md border p-4",
            result.kind === "success" &&
              "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
            result.kind === "warning" &&
              "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
            result.kind === "error" && "border-destructive/40 bg-destructive/10 text-destructive"
          )}
          role={result.kind === "error" ? "alert" : "status"}
        >
          <p className="font-semibold">{result.title}</p>
          {result.subtitle && <p className="mt-1 text-xs opacity-80">{result.subtitle}</p>}
        </div>
      )}

      <form onSubmit={onManualSubmit} className="rounded-md border border-border bg-card p-5 space-y-3">
        <p className="font-mono text-xs font-bold tracking-[0.25em] text-gold">MANUAL CHECK-IN</p>
        <p className="text-sm text-cream-70">
          If the camera isn&rsquo;t working, paste the QR token (or the URL it points to).
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="grid flex-1 gap-2">
            <Label htmlFor="manual-token">Token or URL</Label>
            <Input
              id="manual-token"
              value={manualToken}
              onChange={(e) => setManualToken(e.target.value)}
              placeholder="abcd1234..."
              disabled={looking || marking}
            />
          </div>
          <Button type="submit" disabled={looking || marking || manualToken.trim().length === 0}>
            {looking ? "Looking up..." : "Look up"}
          </Button>
        </div>
      </form>

      {pending && (
        <ConfirmModal
          invitee={pending}
          marking={marking}
          onConfirm={confirmMark}
          onCancel={cancelMark}
        />
      )}
    </div>
  );
}

function ConfirmModal({
  invitee,
  marking,
  onConfirm,
  onCancel,
}: {
  invitee: LookupOk["invitee"];
  marking: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[110] flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-5 shadow-xl">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold">CONFIRM CHECK-IN</p>
        <p className="mt-2 text-xl font-semibold text-cream">
          {invitee.name ?? invitee.email}
        </p>
        <p className="mt-1 text-xs text-cream-70 break-all">{invitee.email}</p>

        <dl className="mt-4 grid gap-2 text-sm">
          {invitee.role === "parent" && invitee.studentName && (
            <Row label="Student" value={invitee.studentName} />
          )}
          {invitee.role && <Row label="Attending as" value={invitee.role} />}
          {invitee.school && <Row label="School" value={invitee.school} />}
          {invitee.city && <Row label="City" value={invitee.city} />}
        </dl>

        <div className="mt-6 flex gap-3">
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            onClick={onCancel}
            disabled={marking}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="flex-1"
            onClick={onConfirm}
            disabled={marking}
          >
            {marking ? "Marking..." : "Mark attendance"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-cream-40">{label}</dt>
      <dd className="text-right text-cream">{value}</dd>
    </div>
  );
}
