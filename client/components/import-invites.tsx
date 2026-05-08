"use client";

import { useState, type DragEvent } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface ImportInvitesPanelProps {
  onSent?: () => void;
}

type AutoApproveMode = "immediate" | "delayed" | "never";

interface ParsedRow {
  email: string;
  name?: string;
  errors: string[];
}

const AUTO_APPROVE_LABELS: Record<AutoApproveMode, string> = {
  never: "Never — require manual approval",
  delayed: "After 2 hours of accepting",
  immediate: "Immediately on accepting",
};

interface BulkResultRow {
  email: string;
  ok: boolean;
  message?: string;
  upgraded?: boolean;
}

const SAMPLE_CSV = [
  "email,name",
  "parent@example.com,Parent Name",
  "another@example.com,Another Parent",
  "third@example.com,",
].join("\n");

// Simple, RFC-4180-aware CSV parser. Handles quoted fields and escaped quotes.
function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/);
  // Drop trailing blank lines
  while (lines.length && lines[lines.length - 1].trim() === "") lines.pop();
  if (lines.length === 0) return { headers: [], rows: [] };

  const parseLine = (line: string): string[] => {
    const out: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else if (ch === '"') {
          inQuotes = false;
        } else {
          cur += ch;
        }
      } else if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        out.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
    out.push(cur);
    return out;
  };

  const headers = parseLine(lines[0]).map((h) => h.trim().toLowerCase());
  const rows = lines.slice(1).map(parseLine);
  return { headers, rows };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function buildRows(parsed: { headers: string[]; rows: string[][] }): ParsedRow[] {
  const idx = (key: string) => parsed.headers.indexOf(key);
  const emailIdx = idx("email");
  const nameIdx = idx("name");

  if (emailIdx === -1) {
    return [{ email: "", errors: ["Sheet is missing required column: \"email\""] }];
  }

  return parsed.rows
    .filter((row) => row.some((cell) => cell.trim() !== ""))
    .map<ParsedRow>((row) => {
      const email = (row[emailIdx] ?? "").trim().toLowerCase();
      const name = nameIdx >= 0 ? (row[nameIdx] ?? "").trim() || undefined : undefined;
      const errors: string[] = [];

      if (!email) errors.push("Missing email");
      else if (!EMAIL_RE.test(email)) errors.push("Invalid email");

      return { email, name, errors };
    });
}

export function ImportInvitesPanel({ onSent }: ImportInvitesPanelProps) {
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<BulkResultRow[] | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [autoApproveMode, setAutoApproveMode] = useState<AutoApproveMode>("never");

  const valid = rows.filter((r) => r.errors.length === 0);
  const invalid = rows.filter((r) => r.errors.length > 0);

  const handleFiles = async (files: FileList | File[]) => {
    setParseError(null);
    setResults(null);
    const file = Array.from(files)[0];
    if (!file) return;
    if (!/\.csv$/i.test(file.name) && file.type !== "text/csv") {
      setParseError("Please drop a .csv file. Excel? Save as CSV first.");
      return;
    }
    try {
      const text = await file.text();
      const parsed = parseCsv(text);
      const built = buildRows(parsed);
      setFileName(file.name);
      setRows(built);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "Could not read file");
    }
  };

  const onDrop = (e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) void handleFiles(e.dataTransfer.files);
  };

  const downloadSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "invite-sample.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    setRows([]);
    setFileName(null);
    setResults(null);
    setParseError(null);
  };

  const onSubmit = async () => {
    if (valid.length === 0) return;
    setSubmitting(true);
    setResults(null);
    try {
      const res = await fetch("/api/admin/invite/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invites: valid.map((r) => ({
            email: r.email,
            name: r.name,
            autoApproveMode,
          })),
        }),
      });
      const json = (await res.json()) as
        | { ok: true; sent: number; failed: number; results: BulkResultRow[] }
        | { ok: false; message?: string };
      if (!json.ok) throw new Error(json.message ?? "Bulk invite failed");
      setResults(json.results);
      onSent?.();
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-cream-70">
          Drop a CSV with columns{" "}
          <code className="font-mono text-xs text-gold">email, name</code>.
        </p>
        <Button type="button" size="sm" variant="ghost" onClick={downloadSample}>
          Download sample CSV
        </Button>
      </div>

      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed p-8 text-center transition-colors",
          dragOver
            ? "border-gold bg-gold/5 text-gold"
            : "border-border bg-ink/30 text-cream-40 hover:border-gold/40"
        )}
      >
        <input
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
        {fileName ? (
          <>
            <p className="text-sm text-cream">{fileName}</p>
            <p className="text-xs text-cream-40">
              {rows.length} row{rows.length === 1 ? "" : "s"} · {valid.length} valid
              {invalid.length ? ` · ${invalid.length} invalid` : ""}
            </p>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cream-40">
              Click or drop another file to replace
            </p>
          </>
        ) : (
          <>
            <p className="text-sm">Drop CSV here</p>
            <p className="text-xs">or click to browse</p>
          </>
        )}
      </label>

      {parseError && (
        <p
          className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
          role="alert"
        >
          {parseError}
        </p>
      )}

      {rows.length > 0 && !results && (
        <div className="overflow-hidden rounded-md border border-border">
          <table className="w-full text-sm">
            <thead className="bg-card text-left">
              <tr>
                <th className="px-3 py-2 font-mono text-[10px] tracking-[0.2em] text-cream-40">
                  EMAIL
                </th>
                <th className="px-3 py-2 font-mono text-[10px] tracking-[0.2em] text-cream-40">
                  NAME
                </th>
                <th className="px-3 py-2 font-mono text-[10px] tracking-[0.2em] text-cream-40">
                  STATUS
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t border-border align-top">
                  <td className="px-3 py-2 text-cream">{r.email || "—"}</td>
                  <td className="px-3 py-2 text-cream-70">{r.name ?? "—"}</td>
                  <td className="px-3 py-2">
                    {r.errors.length === 0 ? (
                      <span className="font-mono text-[10px] uppercase tracking-wider text-emerald-300">
                        ready
                      </span>
                    ) : (
                      <span className="text-xs text-destructive">{r.errors.join("; ")}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {rows.length > 0 && !results && (
        <div className="space-y-3 rounded-md border border-border/60 bg-ink/30 p-4">
          <div className="grid gap-2">
            <Label htmlFor="bulk-auto-approve">Auto-approve (applies to all imported invites)</Label>
            <Select
              value={autoApproveMode}
              onValueChange={(v) => setAutoApproveMode(v as AutoApproveMode)}
            >
              <SelectTrigger id="bulk-auto-approve">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="never">{AUTO_APPROVE_LABELS.never}</SelectItem>
                <SelectItem value="delayed">{AUTO_APPROVE_LABELS.delayed}</SelectItem>
                <SelectItem value="immediate">{AUTO_APPROVE_LABELS.immediate}</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-cream-40">
              The clock starts when each invitee submits the form, not when you send the invite.
            </p>
          </div>
          <div className="flex items-center justify-end gap-3 pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={reset}>
              Clear
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={onSubmit}
              disabled={submitting || valid.length === 0}
            >
              {submitting
                ? "Sending..."
                : `Send ${valid.length} invitation${valid.length === 1 ? "" : "s"}`}
            </Button>
          </div>
        </div>
      )}

      {results && (
        <div className="space-y-2 rounded-md border border-border bg-card p-4">
          <p className="text-sm text-cream">
            <span className="text-emerald-300">{results.filter((r) => r.ok).length} sent</span>
            {" · "}
            <span className="text-destructive">
              {results.filter((r) => !r.ok).length} failed
            </span>
          </p>
          <ul className="space-y-1 text-xs">
            {results.map((r, i) => (
              <li key={i} className={r.ok ? "text-cream-70" : "text-destructive"}>
                <span className="font-mono">{r.email}</span>
                {r.ok
                  ? r.upgraded
                    ? " — upgraded from request"
                    : " — invite sent"
                  : ` — ${r.message ?? "failed"}`}
              </li>
            ))}
          </ul>
          <div className="flex justify-end pt-2">
            <Button type="button" size="sm" variant="ghost" onClick={reset}>
              Import another sheet
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
