"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export interface AssignedInvitee {
  id: string;
  email: string;
  name?: string;
  status: string;
  source?: "admin" | "portal";
  decidedAt?: string;
  invitedAt?: string;
  requestedAt?: string;
  attendedAt?: string;
  attendedByName?: string;
  requestData?: {
    role?: "student" | "parent";
    studentName?: string;
    studentAge?: string;
    studentPhone?: string;
    studentEmail?: string;
    parentPhone?: string;
    school?: string;
    city?: string;
    hearAbout?: string;
    referralFrom?: string;
    question?: string;
  };
}

function fmtDate(iso?: string) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function VolunteerDashboard({
  volunteerName,
  initialRows,
}: {
  volunteerName: string;
  initialRows: AssignedInvitee[];
}) {
  const [rows] = useState(initialRows);

  return (
    <main className="container max-w-5xl space-y-8 py-10 md:py-14">
      <div>
        <p className="font-mono text-xs font-bold tracking-[0.25em] text-gold">
          VOLUNTEER DASHBOARD
        </p>
        <h1 className="mt-2 font-heading text-3xl font-bold text-cream">
          Welcome, {volunteerName}.
        </h1>
        <p className="mt-2 text-sm text-cream-70">
          {rows.length === 0
            ? "You don't have any people assigned yet. Once an admin assigns approved attendees to you, they'll appear here."
            : `You have ${rows.length} ${rows.length === 1 ? "person" : "people"} assigned.`}
        </p>
      </div>

      {rows.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-mono text-xs font-bold tracking-[0.25em] text-gold">YOUR PEOPLE</h2>
          <div className="space-y-3">
            {rows.map((row) => (
              <Card key={row.id} row={row} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function Card({ row }: { row: AssignedInvitee }) {
  const [open, setOpen] = useState(false);
  const r = row.requestData;
  const isStudent = r?.role === "student";
  const subjectName = r?.studentName ?? row.name ?? "—";
  const ageBit = r?.studentAge ? `, ${r.studentAge}` : "";

  return (
    <div className="rounded-md border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-start justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-card/60"
      >
        <div>
          <p className="text-base font-semibold text-cream">{row.name ?? row.email}</p>
          <p className="mt-0.5 text-xs text-cream-40">{row.email}</p>
          <div className="mt-1 flex flex-wrap gap-2 text-xs text-cream-70">
            {r?.role && (
              <span className="rounded bg-gold/15 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-gold">
                {r.role}
              </span>
            )}
            {row.attendedAt ? (
              <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                ✓ Attended
              </span>
            ) : (
              <span className="rounded bg-cream/10 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-cream-70">
                Not yet
              </span>
            )}
            <span>
              {isStudent ? "Themself" : "Student"}: {subjectName}
              {ageBit}
            </span>
            {r?.school && <span>· {r.school}</span>}
            {r?.city && <span>· {r.city}</span>}
          </div>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-cream-40">
          {open ? "Hide" : "Details"}
        </span>
      </button>
      {open && (
        <div className="border-t border-border px-5 py-4">
          <dl className="grid gap-3 sm:grid-cols-2">
            {r?.parentPhone && <Detail label="Parent's phone" value={r.parentPhone} />}
            {r?.studentEmail && <Detail label="Student's email" value={r.studentEmail} />}
            {r?.studentPhone && (
              <Detail label={isStudent ? "Phone" : "Student's phone"} value={r.studentPhone} />
            )}
            {r?.school && <Detail label="School" value={r.school} />}
            {r?.city && <Detail label="City" value={r.city} />}
            {r?.hearAbout && (
              <Detail
                label="Heard about us"
                value={r.hearAbout + (r.referralFrom ? ` (${r.referralFrom})` : "")}
              />
            )}
            <Detail
              label="Approved on"
              value={fmtDate(row.decidedAt) ?? fmtDate(row.invitedAt) ?? fmtDate(row.requestedAt) ?? "—"}
            />
            {r?.question && (
              <div className="grid gap-0.5 sm:col-span-2">
                <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-cream-40">
                  Question
                </dt>
                <dd className="whitespace-pre-wrap text-sm text-cream-70">{r.question}</dd>
              </div>
            )}
          </dl>
        </div>
      )}
    </div>
  );
}

function Detail({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={cn("grid gap-0.5", className)}>
      <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-cream-40">{label}</dt>
      <dd className="text-sm text-cream">{value}</dd>
    </div>
  );
}
