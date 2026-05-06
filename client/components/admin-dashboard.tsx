"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface InviteeRow {
  id: string;
  email: string;
  name?: string;
  status: "requested" | "invited" | "registered" | "otp_verified" | "approved" | "rejected";
  token: string;
  reason?: string;
  requestedAt?: string;
  invitedAt?: string;
  registeredAt?: string;
  verifiedAt?: string;
  decidedAt?: string;
  formData?: Record<string, unknown>;
}

const statusLabels: Record<InviteeRow["status"], string> = {
  requested: "Requested",
  invited: "Invited",
  registered: "Awaiting OTP",
  otp_verified: "Pending review",
  approved: "Approved",
  rejected: "Rejected",
};

const statusColors: Record<InviteeRow["status"], string> = {
  requested: "bg-blue-500/15 text-blue-300",
  invited: "bg-cream/10 text-cream-70",
  registered: "bg-cream/10 text-cream-70",
  otp_verified: "bg-gold/15 text-gold",
  approved: "bg-emerald-500/15 text-emerald-300",
  rejected: "bg-destructive/15 text-destructive",
};

export function AdminDashboard({ initialRows }: { initialRows: InviteeRow[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [filter, setFilter] = useState<"all" | InviteeRow["status"]>("all");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const filtered = filter === "all" ? rows : rows.filter((r) => r.status === filter);
  const pendingReviewCount = rows.filter((r) => r.status === "otp_verified").length;
  const requestedCount = rows.filter((r) => r.status === "requested").length;

  const refresh = () => {
    startTransition(() => {
      router.refresh();
      fetch("/api/admin/invitees")
        .then((r) => r.json())
        .then((j: { ok: boolean; invitees?: InviteeRow[] }) => {
          if (j.ok && j.invitees) setRows(j.invitees);
        })
        .catch(() => {});
    });
  };

  const decide = async (token: string, decision: "approve" | "reject") => {
    setError(null);
    const res = await fetch("/api/admin/decide", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, decision }),
    });
    const json = (await res.json()) as { ok: boolean; message?: string };
    if (!json.ok) {
      setError(json.message ?? "Could not update");
      return;
    }
    refresh();
  };

  const sendInvite = async (email: string) => {
    setError(null);
    const res = await fetch("/api/admin/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const json = (await res.json()) as { ok: boolean; message?: string };
    if (!json.ok) {
      setError(json.message ?? "Could not send invite");
      return;
    }
    refresh();
  };

  const declineRequest = async (id: string) => {
    if (!confirm("Decline this request? It will be removed from the queue.")) return;
    setError(null);
    const res = await fetch(`/api/admin/request/${id}`, { method: "DELETE" });
    const json = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string };
    if (!json.ok) {
      setError(json.message ?? "Could not decline");
      return;
    }
    refresh();
  };

  return (
    <main className="container max-w-5xl py-10 md:py-14 space-y-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-mono text-xs font-bold tracking-[0.25em] text-gold">
            INVITEES
          </p>
          <h1 className="mt-2 font-heading text-3xl font-bold text-cream">
            {rows.length} total
          </h1>
          <p className="mt-1 font-sans text-sm text-cream-70">
            {requestedCount} new requests · {pendingReviewCount} pending review
          </p>
        </div>
      </div>

      <InviteForm onSent={refresh} />

      <section className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {(["all", "requested", "otp_verified", "registered", "invited", "approved", "rejected"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-full px-3 py-1 font-mono text-xs uppercase tracking-wider border transition-colors",
                filter === f
                  ? "border-gold text-gold bg-gold/10"
                  : "border-border text-cream-70 hover:border-gold/40",
              )}
            >
              {f === "all" ? "All" : statusLabels[f]}
            </button>
          ))}
        </div>

        {error && (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <div className="rounded-md border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-card text-left">
              <tr>
                <th className="px-4 py-3 font-mono text-[11px] tracking-[0.2em] text-cream-40">EMAIL</th>
                <th className="px-4 py-3 font-mono text-[11px] tracking-[0.2em] text-cream-40">NAME</th>
                <th className="px-4 py-3 font-mono text-[11px] tracking-[0.2em] text-cream-40">STATUS</th>
                <th className="px-4 py-3 font-mono text-[11px] tracking-[0.2em] text-cream-40 w-px">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-cream-40">
                    No invitees match this filter.
                  </td>
                </tr>
              )}
              {filtered.map((row) => (
                <Row
                  key={row.id}
                  row={row}
                  onDecide={decide}
                  onSendInvite={sendInvite}
                  onDecline={declineRequest}
                  pending={pending}
                />
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function Row({
  row,
  onDecide,
  onSendInvite,
  onDecline,
  pending,
}: {
  row: InviteeRow;
  onDecide: (token: string, d: "approve" | "reject") => void;
  onSendInvite: (email: string) => void;
  onDecline: (id: string) => void;
  pending: boolean;
}) {
  const [open, setOpen] = useState(false);
  const canDecide = row.status === "otp_verified";
  const isRequest = row.status === "requested";
  const hasDetails = Boolean(row.formData) || Boolean(row.reason);

  return (
    <>
      <tr className="border-t border-border align-top">
        <td className="px-4 py-3 text-cream">{row.email}</td>
        <td className="px-4 py-3 text-cream-70">{row.name ?? "—"}</td>
        <td className="px-4 py-3">
          <span className={cn("inline-block rounded-full px-2 py-0.5 text-xs font-medium", statusColors[row.status])}>
            {statusLabels[row.status]}
          </span>
        </td>
        <td className="px-4 py-3 whitespace-nowrap">
          <div className="flex gap-2">
            {hasDetails && (
              <Button variant="ghost" size="sm" onClick={() => setOpen((o) => !o)}>
                {open ? "Hide" : "Details"}
              </Button>
            )}
            {isRequest && (
              <>
                <Button size="sm" disabled={pending} onClick={() => onSendInvite(row.email)}>
                  Send invite
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={pending}
                  onClick={() => onDecline(row.id)}
                >
                  Decline
                </Button>
              </>
            )}
            {canDecide && (
              <>
                <Button size="sm" disabled={pending} onClick={() => onDecide(row.token, "approve")}>
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={pending}
                  onClick={() => onDecide(row.token, "reject")}
                >
                  Reject
                </Button>
              </>
            )}
          </div>
        </td>
      </tr>
      {open && hasDetails && (
        <tr className="border-t border-border bg-card/60">
          <td colSpan={4} className="px-4 py-4">
            {row.reason && (
              <div className="mb-4 grid gap-0.5">
                <dt className="font-mono text-[10px] tracking-[0.2em] text-cream-40 uppercase">REQUEST NOTE</dt>
                <dd className="text-sm text-cream-70 whitespace-pre-wrap">{row.reason}</dd>
              </div>
            )}
            {row.formData && (
              <dl className="grid gap-3 sm:grid-cols-2">
                {Object.entries(row.formData).map(([k, v]) => (
                  <div key={k} className="grid gap-0.5">
                    <dt className="font-mono text-[10px] tracking-[0.2em] text-cream-40 uppercase">{k}</dt>
                    <dd className="text-sm text-cream">{String(v) || "—"}</dd>
                  </div>
                ))}
              </dl>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

function InviteForm({ onSent }: { onSent: () => void }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; message: string } | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name: name || undefined }),
      });
      const json = (await res.json()) as { ok: boolean; message?: string };
      if (!json.ok) throw new Error(json.message ?? "Could not send invite");
      setFeedback({ type: "ok", message: `Invite sent to ${email}` });
      setEmail("");
      setName("");
      onSent();
    } catch (err) {
      setFeedback({ type: "err", message: err instanceof Error ? err.message : "Something went wrong" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="rounded-md border border-border bg-card p-6 md:p-8">
      <p className="font-mono text-xs font-bold tracking-[0.25em] text-gold">
        SEND NEW INVITATION
      </p>
      <form onSubmit={onSubmit} className="mt-5 grid gap-4 sm:grid-cols-[2fr_2fr_auto] sm:items-end">
        <div className="grid gap-2">
          <Label htmlFor="invite-email">Email</Label>
          <Input
            id="invite-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="parent@example.com"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="invite-name">Name (optional)</Label>
          <Input
            id="invite-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Parent's name"
          />
        </div>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Sending..." : "Send invite"}
        </Button>
      </form>
      {feedback && (
        <p
          className={cn(
            "mt-4 rounded-md border p-3 text-sm",
            feedback.type === "ok"
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
              : "border-destructive/40 bg-destructive/10 text-destructive",
          )}
          role={feedback.type === "err" ? "alert" : undefined}
        >
          {feedback.message}
        </p>
      )}
    </section>
  );
}
