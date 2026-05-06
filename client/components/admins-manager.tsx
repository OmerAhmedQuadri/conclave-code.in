"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface AdminRow {
  id: string;
  email: string;
  createdAt?: string;
  createdBy?: string;
}

interface Props {
  me: string;
  bootstrapEmail: string | null;
  initialRows: AdminRow[];
}

export function AdminsManager({ me, bootstrapEmail, initialRows }: Props) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; message: string } | null>(null);

  const refresh = async () => {
    router.refresh();
    const res = await fetch("/api/admin/admins");
    const json = (await res.json()) as { ok: boolean; admins?: AdminRow[] };
    if (json.ok && json.admins) setRows(json.admins);
  };

  const onAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = (await res.json()) as { ok: boolean; message?: string };
      if (!json.ok) throw new Error(json.message ?? "Could not add admin");
      setFeedback({ type: "ok", message: `Added ${email}` });
      setEmail("");
      setPassword("");
      await refresh();
    } catch (err) {
      setFeedback({
        type: "err",
        message: err instanceof Error ? err.message : "Something went wrong",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const onRemove = async (target: string) => {
    if (!confirm(`Remove admin ${target}?`)) return;
    const res = await fetch(`/api/admin/admins?email=${encodeURIComponent(target)}`, {
      method: "DELETE",
    });
    const json = (await res.json()) as { ok: boolean; message?: string };
    if (!json.ok) {
      setFeedback({ type: "err", message: json.message ?? "Could not remove" });
      return;
    }
    await refresh();
  };

  return (
    <main className="container max-w-3xl space-y-10 py-10 md:py-14">
      <div>
        <p className="font-mono text-xs font-bold tracking-[0.25em] text-gold">ADMINS</p>
        <h1 className="mt-2 font-heading text-3xl font-bold text-cream">Manage admin access</h1>
        <p className="mt-3 max-w-xl text-sm text-cream-70">
          The bootstrap admin from <code className="font-mono text-xs text-gold">ADMIN_EMAIL</code>{" "}
          always works. Add additional admins below — each gets their own email + password.
        </p>
      </div>

      <section className="rounded-md border border-border bg-card p-6 md:p-8">
        <p className="font-mono text-xs font-bold tracking-[0.25em] text-gold">ADD ADMIN</p>
        <form onSubmit={onAdd} className="mt-5 grid gap-4 sm:grid-cols-[2fr_2fr_auto] sm:items-end">
          <div className="grid gap-2">
            <Label htmlFor="new-admin-email">Email</Label>
            <Input
              id="new-admin-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="new-admin-password">Temporary password</Label>
            <Input
              id="new-admin-password"
              type="text"
              minLength={8}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 8 chars"
            />
          </div>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Adding..." : "Add admin"}
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

      <section className="overflow-hidden rounded-md border border-border">
        <table className="w-full text-sm">
          <thead className="bg-card text-left">
            <tr>
              <th className="px-4 py-3 font-mono text-[11px] tracking-[0.2em] text-cream-40">
                EMAIL
              </th>
              <th className="px-4 py-3 font-mono text-[11px] tracking-[0.2em] text-cream-40">
                ADDED BY
              </th>
              <th className="w-px px-4 py-3 font-mono text-[11px] tracking-[0.2em] text-cream-40">
                ACTIONS
              </th>
            </tr>
          </thead>
          <tbody>
            {bootstrapEmail && (
              <tr className="border-t border-border align-top">
                <td className="px-4 py-3 text-cream">
                  {bootstrapEmail}
                  <span className="ml-2 inline-block rounded-full bg-gold/15 px-2 py-0.5 font-mono text-[10px] tracking-wider text-gold">
                    BOOTSTRAP
                  </span>
                </td>
                <td className="px-4 py-3 text-cream-40">env</td>
                <td className="whitespace-nowrap px-4 py-3 text-cream-40">—</td>
              </tr>
            )}
            {rows.length === 0 && !bootstrapEmail && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-cream-40">
                  No admins yet.
                </td>
              </tr>
            )}
            {rows.map((row) => {
              const isMe = row.email === me;
              const isBootstrap = row.email === bootstrapEmail;
              return (
                <tr key={row.id} className="border-t border-border align-top">
                  <td className="px-4 py-3 text-cream">
                    {row.email}
                    {isMe && (
                      <span className="ml-2 inline-block rounded-full bg-gold/15 px-2 py-0.5 font-mono text-[10px] tracking-wider text-gold">
                        YOU
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-cream-70">{row.createdBy ?? "—"}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => onRemove(row.email)}
                      disabled={isMe || isBootstrap}
                    >
                      Remove
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </main>
  );
}
