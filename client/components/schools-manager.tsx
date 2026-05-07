"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface PocDraft {
  name: string;
  email: string;
  phone: string;
}

export interface SchoolRow {
  id: string;
  name: string;
  pocs?: { name: string; email?: string; phone?: string }[];
  createdAt?: string;
  createdBy?: string;
}

const emptyPoc = (): PocDraft => ({ name: "", email: "", phone: "" });

export function SchoolsManager({ initialRows }: { initialRows: SchoolRow[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; message: string } | null>(null);

  const refresh = async () => {
    router.refresh();
    const res = await fetch("/api/admin/schools");
    const json = (await res.json()) as { ok: boolean; schools?: SchoolRow[] };
    if (json.ok && json.schools) setRows(json.schools);
  };

  return (
    <main className="container max-w-4xl space-y-10 py-10 md:py-14">
      <div>
        <p className="font-mono text-xs font-bold tracking-[0.25em] text-gold">SCHOOLS</p>
        <h1 className="mt-2 font-heading text-3xl font-bold text-cream">Manage schools</h1>
        <p className="mt-3 max-w-xl text-sm text-cream-70">
          These show up in the dropdown on the request-invite form. Add points of contact (POC) per
          school to keep their info handy.
        </p>
      </div>

      {feedback && (
        <p
          className={cn(
            "rounded-md border p-3 text-sm",
            feedback.type === "ok"
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
              : "border-destructive/40 bg-destructive/10 text-destructive"
          )}
          role={feedback.type === "err" ? "alert" : undefined}
        >
          {feedback.message}
        </p>
      )}

      <AddSchoolForm onSaved={refresh} setFeedback={setFeedback} />

      <section className="space-y-3">
        <h2 className="font-mono text-xs font-bold tracking-[0.25em] text-gold">SCHOOL LIST</h2>
        {rows.length === 0 ? (
          <p className="rounded-md border border-border bg-card p-8 text-center text-cream-40">
            No schools yet — add one above.
          </p>
        ) : (
          <div className="space-y-3">
            {rows.map((row) => (
              <SchoolCard
                key={row.id}
                row={row}
                onSaved={refresh}
                setFeedback={setFeedback}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function AddSchoolForm({
  onSaved,
  setFeedback,
}: {
  onSaved: () => Promise<void>;
  setFeedback: (f: { type: "ok" | "err"; message: string } | null) => void;
}) {
  const [name, setName] = useState("");
  const [pocs, setPocs] = useState<PocDraft[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setName("");
    setPocs([]);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/schools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          pocs: pocs.filter((p) => p.name.trim()),
        }),
      });
      const json = (await res.json()) as { ok: boolean; message?: string };
      if (!json.ok) throw new Error(json.message ?? "Could not add school");
      setFeedback({ type: "ok", message: `Added ${name}` });
      reset();
      await onSaved();
    } catch (err) {
      setFeedback({
        type: "err",
        message: err instanceof Error ? err.message : "Something went wrong",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="rounded-md border border-border bg-card p-6 md:p-8">
      <p className="font-mono text-xs font-bold tracking-[0.25em] text-gold">ADD SCHOOL</p>
      <form onSubmit={onSubmit} className="mt-5 space-y-5">
        <div className="grid gap-2">
          <Label htmlFor="new-school-name">School / college name</Label>
          <Input
            id="new-school-name"
            required
            minLength={2}
            maxLength={160}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Hyderabad Public School"
          />
        </div>

        <PocEditor pocs={pocs} setPocs={setPocs} />

        <div className="flex justify-end">
          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving..." : "Add school"}
          </Button>
        </div>
      </form>
    </section>
  );
}

function PocEditor({
  pocs,
  setPocs,
}: {
  pocs: PocDraft[];
  setPocs: (p: PocDraft[]) => void;
}) {
  const addPoc = () => setPocs([...pocs, emptyPoc()]);
  const removePoc = (i: number) => setPocs(pocs.filter((_, idx) => idx !== i));
  const updatePoc = (i: number, patch: Partial<PocDraft>) =>
    setPocs(pocs.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));

  return (
    <div className="space-y-3 rounded-md border border-border/50 p-4">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cream-40">
          Points of contact (optional)
        </p>
        <Button type="button" size="sm" variant="ghost" onClick={addPoc}>
          + Add POC
        </Button>
      </div>

      {pocs.length === 0 && (
        <p className="text-xs text-cream-40">No POCs yet. Click &quot;Add POC&quot; to add one.</p>
      )}

      {pocs.map((poc, i) => (
        <div key={i} className="grid gap-3 rounded border border-border/40 bg-ink/30 p-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
          <div className="grid gap-1.5">
            <Label htmlFor={`poc-name-${i}`} className="text-[11px]">
              Name
            </Label>
            <Input
              id={`poc-name-${i}`}
              required
              value={poc.name}
              onChange={(e) => updatePoc(i, { name: e.target.value })}
              placeholder="POC name"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={`poc-email-${i}`} className="text-[11px]">
              Email
            </Label>
            <Input
              id={`poc-email-${i}`}
              type="email"
              value={poc.email}
              onChange={(e) => updatePoc(i, { email: e.target.value })}
              placeholder="poc@example.com"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={`poc-phone-${i}`} className="text-[11px]">
              Phone
            </Label>
            <Input
              id={`poc-phone-${i}`}
              value={poc.phone}
              onChange={(e) => updatePoc(i, { phone: e.target.value })}
              placeholder="+91 ..."
            />
          </div>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => removePoc(i)}
            className="text-destructive"
          >
            Remove
          </Button>
        </div>
      ))}
    </div>
  );
}

function SchoolCard({
  row,
  onSaved,
  setFeedback,
}: {
  row: SchoolRow;
  onSaved: () => Promise<void>;
  setFeedback: (f: { type: "ok" | "err"; message: string } | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [pocs, setPocs] = useState<PocDraft[]>(
    () => (row.pocs ?? []).map((p) => ({ name: p.name, email: p.email ?? "", phone: p.phone ?? "" }))
  );
  const [saving, setSaving] = useState(false);

  const onRemove = async () => {
    if (!confirm(`Remove school "${row.name}"?`)) return;
    const res = await fetch(`/api/admin/schools/${row.id}`, { method: "DELETE" });
    const json = (await res.json()) as { ok: boolean; message?: string };
    if (!json.ok) {
      setFeedback({ type: "err", message: json.message ?? "Could not remove" });
      return;
    }
    await onSaved();
  };

  const onSavePocs = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/admin/schools/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pocs: pocs.filter((p) => p.name.trim()) }),
      });
      const json = (await res.json()) as { ok: boolean; message?: string };
      if (!json.ok) throw new Error(json.message ?? "Could not save");
      setFeedback({ type: "ok", message: `Updated ${row.name}` });
      setEditing(false);
      await onSaved();
    } catch (err) {
      setFeedback({
        type: "err",
        message: err instanceof Error ? err.message : "Something went wrong",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-md border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-base font-semibold text-cream">{row.name}</p>
          <p className="mt-1 text-xs text-cream-40">
            {row.createdBy ? `Added by ${row.createdBy}` : "—"}
            {row.pocs?.length ? ` · ${row.pocs.length} POC${row.pocs.length === 1 ? "" : "s"}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => setEditing((v) => !v)}>
            {editing ? "Cancel" : "Manage POCs"}
          </Button>
          <Button size="sm" variant="secondary" onClick={onRemove} className="text-destructive">
            Remove
          </Button>
        </div>
      </div>

      {!editing && row.pocs && row.pocs.length > 0 && (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {row.pocs.map((p, i) => (
            <div key={i} className="rounded border border-border/40 bg-ink/30 p-3">
              <p className="text-sm font-medium text-cream">{p.name}</p>
              {p.email && <p className="mt-0.5 text-xs text-cream-70">{p.email}</p>}
              {p.phone && <p className="text-xs text-cream-70">{p.phone}</p>}
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div className="mt-4 space-y-3">
          <PocEditor pocs={pocs} setPocs={setPocs} />
          <div className="flex justify-end">
            <Button size="sm" onClick={onSavePocs} disabled={saving}>
              {saving ? "Saving..." : "Save POCs"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
