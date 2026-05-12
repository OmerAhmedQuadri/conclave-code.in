"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface VolunteerRow {
  id: string;
  email: string;
  name: string;
  createdAt?: string;
  createdBy?: string;
  assignedCount?: number;
}

export function VolunteersManager({ initialRows }: { initialRows: VolunteerRow[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; message: string } | null>(null);

  const refresh = async () => {
    router.refresh();
    const res = await fetch("/api/admin/volunteers");
    const json = (await res.json()) as { ok: boolean; volunteers?: VolunteerRow[] };
    if (json.ok && json.volunteers) setRows(json.volunteers);
  };

  const onAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/volunteers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const json = (await res.json()) as { ok: boolean; message?: string };
      if (!json.ok) throw new Error(json.message ?? "Could not add volunteer");
      setFeedback({ type: "ok", message: `Added ${name}` });
      setName("");
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
    if (!confirm(`Remove volunteer ${target}? Their assignments will be cleared.`)) return;
    const res = await fetch(`/api/admin/volunteers?email=${encodeURIComponent(target)}`, {
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
    <main className="container max-w-4xl space-y-10 py-10 md:py-14">
      <div>
        <p className="font-mono text-xs font-bold tracking-[0.25em] text-gold">VOLUNTEERS</p>
        <h1 className="mt-2 font-heading text-3xl font-bold text-cream">Manage volunteers</h1>
        <p className="mt-3 max-w-xl text-sm text-cream-70">
          Volunteers sign in at <code className="font-mono text-xs text-gold">/volunteer/login</code>{" "}
          and see only the people you assign to them. Share the password with them out of band.
        </p>
      </div>

      <section className="rounded-md border border-border bg-card p-6 md:p-8">
        <p className="font-mono text-xs font-bold tracking-[0.25em] text-gold">ADD VOLUNTEER</p>
        <form
          onSubmit={onAdd}
          className="mt-5 grid gap-4 sm:grid-cols-2 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end"
        >
          <div className="grid gap-2">
            <Label htmlFor="new-volunteer-name">Name</Label>
            <Input
              id="new-volunteer-name"
              required
              minLength={2}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Volunteer's name"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="new-volunteer-email">Email</Label>
            <Input
              id="new-volunteer-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="volunteer@email.com"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="new-volunteer-password">Password</Label>
            <Input
              id="new-volunteer-password"
              type="text"
              minLength={8}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 8 chars"
            />
          </div>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Adding..." : "Add"}
          </Button>
        </form>
        {feedback && (
          <p
            className={cn(
              "mt-4 rounded-md border p-3 text-sm",
              feedback.type === "ok"
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                : "border-destructive/40 bg-destructive/10 text-destructive"
            )}
            role={feedback.type === "err" ? "alert" : undefined}
          >
            {feedback.message}
          </p>
        )}
      </section>

      <section className="overflow-x-auto rounded-md border border-border">
        <table className="w-full min-w-[520px] text-sm">
          <thead className="bg-card text-left">
            <tr>
              <th className="px-4 py-3 font-mono text-[11px] tracking-[0.2em] text-cream-40">
                NAME
              </th>
              <th className="px-4 py-3 font-mono text-[11px] tracking-[0.2em] text-cream-40">
                EMAIL
              </th>
              <th className="px-4 py-3 font-mono text-[11px] tracking-[0.2em] text-cream-40">
                ASSIGNED
              </th>
              <th className="w-px px-4 py-3 font-mono text-[11px] tracking-[0.2em] text-cream-40">
                ACTIONS
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-cream-40">
                  No volunteers yet.
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-border align-top">
                <td className="px-4 py-3 text-cream">{row.name}</td>
                <td className="px-4 py-3 text-cream-70">{row.email}</td>
                <td className="px-4 py-3 text-cream-70">{row.assignedCount ?? 0}</td>
                <td className="whitespace-nowrap px-4 py-3">
                  <Button size="sm" variant="secondary" onClick={() => onRemove(row.email)}>
                    Remove
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
