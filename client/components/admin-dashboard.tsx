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
  source?: "admin" | "portal";
  token: string;
  reason?: string;
  invitedBy?: string;
  decidedBy?: string;
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

function fmtDate(iso?: string) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function relevantDate(row: InviteeRow) {
  return row.decidedAt ?? row.verifiedAt ?? row.registeredAt ?? row.invitedAt ?? row.requestedAt;
}

export function AdminDashboard({ initialRows }: { initialRows: InviteeRow[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [filter, setFilter] = useState<"all" | InviteeRow["status"]>("all");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const filtered = filter === "all" ? rows : rows.filter((r) => r.status === filter);

  const counts = {
    total: rows.length,
    requested: rows.filter((r) => r.status === "requested").length,
    pendingReview: rows.filter((r) => r.status === "otp_verified").length,
    approved: rows.filter((r) => r.status === "approved").length,
    fromPortal: rows.filter((r) => r.source === "portal").length,
    fromAdmin: rows.filter((r) => r.source === "admin").length,
  };

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
    if (!json.ok) { setError(json.message ?? "Could not update"); return; }
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
    if (!json.ok) { setError(json.message ?? "Could not send invite"); return; }
    refresh();
  };

  const deleteInvitee = async (id: string, email: string) => {
    if (!confirm(`Permanently delete ${email}? This cannot be undone.`)) return;
    setError(null);
    const res = await fetch(`/api/admin/invitees/${id}`, { method: "DELETE" });
    const json = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string };
    if (!json.ok) { setError(json.message ?? "Could not delete"); return; }
    refresh();
  };

  return (
    <main className="container max-w-5xl space-y-10 py-10 md:py-14">
      {/* Header */}
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Total" value={counts.total} />
        <StatCard label="New requests" value={counts.requested} highlight={counts.requested > 0} />
        <StatCard label="Pending review" value={counts.pendingReview} highlight={counts.pendingReview > 0} />
        <StatCard label="Approved" value={counts.approved} />
        <StatCard label="Via portal" value={counts.fromPortal} />
        <StatCard label="Admin invited" value={counts.fromAdmin} />
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
                "rounded-full border px-3 py-1 font-mono text-xs uppercase tracking-wider transition-colors",
                filter === f
                  ? "border-gold bg-gold/10 text-gold"
                  : "border-border text-cream-70 hover:border-gold/40"
              )}
            >
              {f === "all" ? `All (${counts.total})` : `${statusLabels[f]} (${rows.filter((r) => r.status === f).length})`}
            </button>
          ))}
        </div>

        {error && (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <thead className="bg-card text-left">
              <tr>
                <th className="px-4 py-3 font-mono text-[11px] tracking-[0.2em] text-cream-40">EMAIL / SOURCE</th>
                <th className="px-4 py-3 font-mono text-[11px] tracking-[0.2em] text-cream-40">NAME</th>
                <th className="px-4 py-3 font-mono text-[11px] tracking-[0.2em] text-cream-40">STATUS</th>
                <th className="px-4 py-3 font-mono text-[11px] tracking-[0.2em] text-cream-40">DATE</th>
                <th className="w-px px-4 py-3 font-mono text-[11px] tracking-[0.2em] text-cream-40">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-cream-40">
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
                  onDelete={deleteInvitee}
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

function StatCard({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={cn("rounded-md border p-4", highlight ? "border-gold/40 bg-gold/5" : "border-border bg-card")}>
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cream-40">{label}</p>
      <p className={cn("mt-1 text-2xl font-bold", highlight ? "text-gold" : "text-cream")}>{value}</p>
    </div>
  );
}

function Row({
  row,
  onDecide,
  onSendInvite,
  onDelete,
  pending,
}: {
  row: InviteeRow;
  onDecide: (token: string, d: "approve" | "reject") => void;
  onSendInvite: (email: string) => void;
  onDelete: (id: string, email: string) => void;
  pending: boolean;
}) {
  const [open, setOpen] = useState(false);
  const canDecide = row.status === "otp_verified";
  const isRequest = row.status === "requested";
  const hasDetails = Boolean(row.formData) || Boolean(row.reason) || Boolean(row.invitedBy) || Boolean(row.decidedBy);

  return (
    <>
      <tr className="border-t border-border align-top">
        <td className="px-4 py-3">
          <span className="block text-cream">{row.email}</span>
          {row.source && (
            <span className={cn(
              "mt-0.5 inline-block rounded px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider",
              row.source === "admin"
                ? "bg-purple-500/15 text-purple-300"
                : "bg-sky-500/15 text-sky-300"
            )}>
              {row.source === "admin" ? "Admin invite" : "Portal request"}
            </span>
          )}
        </td>
        <td className="px-4 py-3 text-cream-70">{row.name ?? "—"}</td>
        <td className="px-4 py-3">
          <span className={cn("inline-block rounded-full px-2 py-0.5 text-xs font-medium", statusColors[row.status])}>
            {statusLabels[row.status]}
          </span>
        </td>
        <td className="px-4 py-3 text-cream-40 text-xs">{fmtDate(relevantDate(row)) ?? "—"}</td>
        <td className="whitespace-nowrap px-4 py-3">
          <div className="flex gap-2">
            {hasDetails && (
              <Button variant="ghost" size="sm" onClick={() => setOpen((o) => !o)}>
                {open ? "Hide" : "Details"}
              </Button>
            )}
            {isRequest && (
              <Button size="sm" disabled={pending} onClick={() => onSendInvite(row.email)}>
                Send invite
              </Button>
            )}
            {canDecide && (
              <>
                <Button size="sm" disabled={pending} onClick={() => onDecide(row.token, "approve")}>
                  Approve
                </Button>
                <Button size="sm" variant="secondary" disabled={pending} onClick={() => onDecide(row.token, "reject")}>
                  Reject
                </Button>
              </>
            )}
            <Button
              size="sm"
              variant="secondary"
              disabled={pending}
              onClick={() => onDelete(row.id, row.email)}
              className="text-destructive hover:border-destructive/60 hover:text-destructive"
            >
              Delete
            </Button>
          </div>
        </td>
      </tr>
      {open && hasDetails && (
        <tr className="border-t border-border bg-card/60">
          <td colSpan={5} className="px-4 py-4">
            <dl className="grid gap-3 sm:grid-cols-2">
              {row.invitedBy && (
                <div className="grid gap-0.5">
                  <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-cream-40">Invited by</dt>
                  <dd className="text-sm text-cream">{row.invitedBy}</dd>
                </div>
              )}
              {row.decidedBy && (
                <div className="grid gap-0.5">
                  <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-cream-40">Decided by</dt>
                  <dd className="text-sm text-cream">{row.decidedBy}</dd>
                </div>
              )}
              {row.reason && (
                <div className="grid gap-0.5 sm:col-span-2">
                  <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-cream-40">Request note</dt>
                  <dd className="whitespace-pre-wrap text-sm text-cream-70">{row.reason}</dd>
                </div>
              )}
              {row.formData && Object.entries(row.formData).map(([k, v]) => (
                <div key={k} className="grid gap-0.5">
                  <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-cream-40">{k}</dt>
                  <dd className="text-sm text-cream">{String(v) || "—"}</dd>
                </div>
              ))}
            </dl>
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
      const json = (await res.json()) as { ok: boolean; message?: string; upgraded?: boolean };
      if (!json.ok) throw new Error(json.message ?? "Could not send invite");
      setFeedback({
        type: "ok",
        message: json.upgraded ? `Upgraded request and sent invite to ${email}` : `Invite sent to ${email}`,
      });
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
      <p className="font-mono text-xs font-bold tracking-[0.25em] text-gold">SEND NEW INVITATION</p>
      <p className="mt-1 text-xs text-cream-40">Admin-created invites are marked separately from portal requests.</p>
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
              : "border-destructive/40 bg-destructive/10 text-destructive"
          )}
          role={feedback.type === "err" ? "alert" : undefined}
        >
          {feedback.message}
        </p>
      )}
    </section>
  );
}
