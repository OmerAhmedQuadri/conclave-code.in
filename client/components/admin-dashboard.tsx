"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImportInvitesPanel } from "@/components/import-invites";
import { cn } from "@/lib/utils";

export interface InviteeRow {
  id: string;
  email: string;
  originalEmail?: string;
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
  autoApproveMode?: "immediate" | "delayed" | "never";
  autoApproveAfter?: string;
  refreshCount?: number;
  lastRefreshedAt?: string;
  referralCode?: string;
  assignedVolunteerId?: string;
  assignedVolunteerName?: string;
  formData?: Record<string, unknown>;
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

type Segment = "all" | "admin" | "portal";

type AllFilter = "all" | "accepted" | "others";
type AdminFilter = "all" | "sent" | "accepted" | "approved";
type PortalFilter = "all" | "incomplete" | "pending" | "accepted" | "rejected";

// "Invitation sent"     — invite delivered, user hasn't completed acceptance yet
// "Invitation accepted" — user has accepted (form filled), admin hasn't approved yet
// "Invitation approved" — admin approved, OR auto-approved after 2 hours
const ADMIN_SENT_STATUSES: InviteeRow["status"][] = ["invited", "registered"];
const ADMIN_ACCEPTED_STATUSES: InviteeRow["status"][] = ["otp_verified"];
const ADMIN_APPROVED_STATUSES: InviteeRow["status"][] = ["approved"];

const PORTAL_INCOMPLETE_STATUSES: InviteeRow["status"][] = ["otp_verified"];
const PORTAL_PENDING_STATUSES: InviteeRow["status"][] = ["requested"];
const PORTAL_ACCEPTED_STATUSES: InviteeRow["status"][] = ["approved"];
const PORTAL_REJECTED_STATUSES: InviteeRow["status"][] = ["rejected"];

const adminStatusLabel: Record<InviteeRow["status"], string> = {
  requested: "Pending",
  invited: "Invitation sent",
  registered: "Invitation sent",
  otp_verified: "Invitation accepted",
  approved: "Invitation approved",
  rejected: "Rejected",
};

const portalStatusLabel: Record<InviteeRow["status"], string> = {
  requested: "Pending invitation",
  invited: "Invitation sent",
  registered: "Awaiting OTP",
  otp_verified: "Incomplete request",
  approved: "Accepted",
  rejected: "Rejected",
};

// Each badge has a tinted background that works in both modes; the text uses
// a darker shade for light mode (default) and a lighter shade for dark mode.
const statusColors: Record<InviteeRow["status"], string> = {
  requested: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  invited: "bg-cream/10 text-cream-70",
  registered: "bg-cream/10 text-cream-70",
  otp_verified: "bg-gold/15 text-gold",
  approved: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-700 dark:text-emerald-300",
  rejected: "bg-destructive/15 text-destructive",
};

function fmtDate(iso?: string) {
  if (!iso) return null;
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function relevantDate(row: InviteeRow) {
  return row.decidedAt ?? row.verifiedAt ?? row.registeredAt ?? row.invitedAt ?? row.requestedAt;
}

function isDecidable(row: InviteeRow): boolean {
  return (
    row.status === "requested" ||
    (row.status === "otp_verified" && row.source !== "portal")
  );
}

function isRejectable(row: InviteeRow): boolean {
  return isDecidable(row) && row.source !== "admin";
}

export function AdminDashboard({ initialRows }: { initialRows: InviteeRow[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [segment, setSegment] = useState<Segment>("all");
  const [allFilter, setAllFilter] = useState<AllFilter>("all");
  const [adminFilter, setAdminFilter] = useState<AdminFilter>("all");
  const [portalFilter, setPortalFilter] = useState<PortalFilter>("all");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const ALL_SCHOOLS = "__all__";
  const OTHER_SCHOOLS = "__other__";
  const [schoolFilter, setSchoolFilter] = useState<string>(ALL_SCHOOLS);
  const [schoolList, setSchoolList] = useState<{ id: string; name: string }[]>([]);
  const [volunteerList, setVolunteerList] = useState<{ id: string; name: string; email: string }[]>(
    []
  );

  useEffect(() => {
    fetch("/api/admin/schools")
      .then((r) => r.json())
      .then((j: { ok: boolean; schools?: { id: string; name: string }[] }) => {
        if (j.ok && j.schools) setSchoolList(j.schools);
      })
      .catch(() => {});
    fetch("/api/admin/volunteers")
      .then((r) => r.json())
      .then((j: { ok: boolean; volunteers?: { id: string; name: string; email: string }[] }) => {
        if (j.ok && j.volunteers) setVolunteerList(j.volunteers);
      })
      .catch(() => {});
  }, []);

  const assignSelected = async (volunteerId: string) => {
    const ids = rows.filter((r) => selectedIds.has(r.id) && r.status === "approved").map((r) => r.id);
    if (ids.length === 0) {
      setError("Only approved invitees can be assigned. Pick one or more first.");
      return;
    }
    const isUnassign = volunteerId === "__unassign__";
    if (
      !confirm(
        isUnassign
          ? `Unassign volunteer from ${ids.length} invitee(s)?`
          : `Assign ${ids.length} invitee(s) to this volunteer?`
      )
    ) {
      return;
    }
    setError(null);
    setBulkBusy(true);
    try {
      const res = await fetch("/api/admin/invitees/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ volunteerId, inviteeIds: ids }),
      });
      const json = (await res.json()) as { ok: boolean; message?: string; modified?: number };
      if (!json.ok) throw new Error(json.message ?? "Could not assign");
      exitSelectionMode();
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBulkBusy(false);
    }
  };

  const knownSchoolNames = new Set(schoolList.map((s) => s.name));
  const schoolFilteredRows =
    schoolFilter === ALL_SCHOOLS
      ? rows
      : schoolFilter === OTHER_SCHOOLS
        ? rows.filter((r) => {
            const s = r.requestData?.school;
            return Boolean(s) && !knownSchoolNames.has(s!);
          })
        : rows.filter((r) => r.requestData?.school === schoolFilter);

  const adminRows = schoolFilteredRows.filter((r) => r.source === "admin");
  const portalRows = schoolFilteredRows.filter(
    (r) => r.source === "portal" || !r.source
  );

  const adminCounts = {
    all: adminRows.length,
    sent: adminRows.filter((r) => ADMIN_SENT_STATUSES.includes(r.status)).length,
    accepted: adminRows.filter((r) => ADMIN_ACCEPTED_STATUSES.includes(r.status)).length,
    approved: adminRows.filter((r) => ADMIN_APPROVED_STATUSES.includes(r.status)).length,
  };

  const portalCounts = {
    all: portalRows.length,
    incomplete: portalRows.filter((r) => PORTAL_INCOMPLETE_STATUSES.includes(r.status)).length,
    pending: portalRows.filter((r) => PORTAL_PENDING_STATUSES.includes(r.status)).length,
    accepted: portalRows.filter((r) => PORTAL_ACCEPTED_STATUSES.includes(r.status)).length,
    rejected: portalRows.filter((r) => PORTAL_REJECTED_STATUSES.includes(r.status)).length,
  };

  const allCounts = {
    all: schoolFilteredRows.length,
    accepted: schoolFilteredRows.filter((r) => r.status === "approved").length,
    others: schoolFilteredRows.filter((r) => r.status !== "approved").length,
  };

  const filteredAll =
    allFilter === "all"
      ? schoolFilteredRows
      : allFilter === "accepted"
        ? schoolFilteredRows.filter((r) => r.status === "approved")
        : schoolFilteredRows.filter((r) => r.status !== "approved");

  const filteredAdmin =
    adminFilter === "all"
      ? adminRows
      : adminRows.filter((r) => {
          if (adminFilter === "sent") return ADMIN_SENT_STATUSES.includes(r.status);
          if (adminFilter === "accepted") return ADMIN_ACCEPTED_STATUSES.includes(r.status);
          return ADMIN_APPROVED_STATUSES.includes(r.status);
        });

  const filteredPortal =
    portalFilter === "all"
      ? portalRows
      : portalRows.filter((r) => {
          if (portalFilter === "incomplete") return PORTAL_INCOMPLETE_STATUSES.includes(r.status);
          if (portalFilter === "pending") return PORTAL_PENDING_STATUSES.includes(r.status);
          if (portalFilter === "accepted") return PORTAL_ACCEPTED_STATUSES.includes(r.status);
          return PORTAL_REJECTED_STATUSES.includes(r.status);
        });

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

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllVisible = (visibleRows: InviteeRow[], checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const r of visibleRows) {
        if (checked) next.add(r.id);
        else next.delete(r.id);
      }
      return next;
    });
  };

  const bulkDecide = async (decision: "approve" | "reject") => {
    const tokens = rows
      .filter((r) => selectedIds.has(r.id))
      .filter((r) => (decision === "approve" ? isDecidable(r) : isRejectable(r)))
      .map((r) => r.token);
    if (tokens.length === 0) return;
    if (!confirm(`${decision === "approve" ? "Approve" : "Reject"} ${tokens.length} invitee${tokens.length === 1 ? "" : "s"}?`)) {
      return;
    }
    setError(null);
    setBulkBusy(true);
    try {
      const res = await fetch("/api/admin/decide/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokens, decision }),
      });
      const json = (await res.json()) as
        | { ok: true; succeeded: number; failed: number }
        | { ok: false; message?: string };
      if (!json.ok) throw new Error(json.message ?? "Bulk action failed");
      if (json.failed > 0) {
        setError(`${json.succeeded} updated, ${json.failed} skipped (status not eligible).`);
      }
      exitSelectionMode();
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBulkBusy(false);
    }
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

  return (
    <main className="container max-w-6xl space-y-10 py-10 md:py-14">
      {/* Bento: stats on the left, send-invitation on the right.
          On mobile: stats sit in a single 3-column row above the form so we
          don't burn a screenful of vertical space. On md+: stats stack
          vertically alongside the form. */}
      <div className="grid gap-4 md:grid-cols-[minmax(220px,1fr)_2fr]">
        <div className="grid grid-cols-3 gap-3 md:grid-cols-1 md:gap-4">
          <StatCard label="Total" value={rows.length} />
          <StatCard
            label="Pending portal requests"
            value={portalCounts.pending}
            highlight={portalCounts.pending > 0}
          />
          <StatCard label="Approved" value={portalCounts.accepted + adminCounts.accepted} />
        </div>
        <InviteForm onSent={refresh} />
      </div>

      {/* Main segment toggle + school filter */}
      <div className="space-y-3 border-b border-border lg:flex lg:flex-wrap lg:items-end lg:justify-between lg:gap-3 lg:space-y-0">
        <div className="flex flex-wrap gap-2">
          <SegmentTab
            active={segment === "all"}
            onClick={() => setSegment("all")}
            label="All"
            count={schoolFilteredRows.length}
          />
          <SegmentTab
            active={segment === "portal"}
            onClick={() => setSegment("portal")}
            label="Portal requests"
            count={portalCounts.all}
          />
          <SegmentTab
            active={segment === "admin"}
            onClick={() => setSegment("admin")}
            label="Admin invited"
            count={adminCounts.all}
          />
        </div>
        <div className="flex w-full items-center gap-2 pb-3 lg:-mb-px lg:w-auto lg:pb-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-cream-40">
            School
          </span>
          <Select value={schoolFilter} onValueChange={setSchoolFilter}>
            <SelectTrigger className="h-9 min-w-0 flex-1 lg:w-72 lg:flex-initial [&>span]:min-w-0 [&>span]:truncate">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_SCHOOLS}>All schools</SelectItem>
              {schoolList.map((s) => (
                <SelectItem key={s.id} value={s.name}>
                  {s.name}
                </SelectItem>
              ))}
              <SelectItem value={OTHER_SCHOOLS}>Other (not listed)</SelectItem>
            </SelectContent>
          </Select>
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

      {segment === "all" && (
        <Section
          filterPills={
            <FilterPills
              filters={[
                { key: "all", label: `All (${allCounts.all})` },
                { key: "accepted", label: `Accepted (${allCounts.accepted})` },
                { key: "others", label: `Others (${allCounts.others})` },
              ]}
              active={allFilter}
              onChange={(k) => setAllFilter(k as AllFilter)}
            />
          }
          rows={filteredAll}
          segment="all"
          pending={pending}
          onDecide={decide}
          selectionMode={selectionMode}
          onEnterSelectionMode={() => setSelectionMode(true)}
          onExitSelectionMode={exitSelectionMode}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelected}
          onSelectAllVisible={selectAllVisible}
          onBulkDecide={bulkDecide}
          onAssign={assignSelected}
          volunteerList={volunteerList}
          bulkBusy={bulkBusy}
        />
      )}

      {segment === "portal" && (
        <Section
          filterPills={
            <FilterPills
              filters={[
                { key: "all", label: `All (${portalCounts.all})` },
                { key: "incomplete", label: `Incomplete (${portalCounts.incomplete})` },
                { key: "pending", label: `Pending invitation (${portalCounts.pending})` },
                { key: "accepted", label: `Accepted (${portalCounts.accepted})` },
                { key: "rejected", label: `Rejected (${portalCounts.rejected})` },
              ]}
              active={portalFilter}
              onChange={(k) => setPortalFilter(k as PortalFilter)}
            />
          }
          rows={filteredPortal}
          segment="portal"
          pending={pending}
          onDecide={decide}
          selectionMode={selectionMode}
          onEnterSelectionMode={() => setSelectionMode(true)}
          onExitSelectionMode={exitSelectionMode}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelected}
          onSelectAllVisible={selectAllVisible}
          onBulkDecide={bulkDecide}
          onAssign={assignSelected}
          volunteerList={volunteerList}
          bulkBusy={bulkBusy}
        />
      )}

      {segment === "admin" && (
        <Section
          filterPills={
            <FilterPills
              filters={[
                { key: "all", label: `All (${adminCounts.all})` },
                { key: "sent", label: `Invitation sent (${adminCounts.sent})` },
                { key: "accepted", label: `Invitation accepted (${adminCounts.accepted})` },
                { key: "approved", label: `Invitation approved (${adminCounts.approved})` },
              ]}
              active={adminFilter}
              onChange={(k) => setAdminFilter(k as AdminFilter)}
            />
          }
          rows={filteredAdmin}
          segment="admin"
          pending={pending}
          onDecide={decide}
          selectionMode={selectionMode}
          onEnterSelectionMode={() => setSelectionMode(true)}
          onExitSelectionMode={exitSelectionMode}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelected}
          onSelectAllVisible={selectAllVisible}
          onBulkDecide={bulkDecide}
          onAssign={assignSelected}
          volunteerList={volunteerList}
          bulkBusy={bulkBusy}
        />
      )}
    </main>
  );
}

function SegmentTab({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "-mb-px border-b-2 px-4 py-3 font-mono text-xs uppercase tracking-[0.2em] transition-colors",
        active
          ? "border-gold text-gold"
          : "border-transparent text-cream-40 hover:text-cream-70"
      )}
    >
      {label} <span className="ml-1 opacity-60">({count})</span>
    </button>
  );
}

function FilterPills<K extends string>({
  filters,
  active,
  onChange,
}: {
  filters: { key: K; label: string }[];
  active: K;
  onChange: (k: K) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {filters.map((f) => (
        <button
          key={f.key}
          type="button"
          onClick={() => onChange(f.key)}
          className={cn(
            "rounded-full border px-3 py-1 font-mono text-xs uppercase tracking-wider transition-colors",
            active === f.key
              ? "border-gold bg-gold/10 text-gold"
              : "border-border text-cream-70 hover:border-gold/40"
          )}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}

function Section({
  filterPills,
  rows,
  segment,
  pending,
  onDecide,
  selectionMode,
  onEnterSelectionMode,
  onExitSelectionMode,
  selectedIds,
  onToggleSelect,
  onSelectAllVisible,
  onBulkDecide,
  onAssign,
  volunteerList,
  bulkBusy,
}: {
  filterPills: React.ReactNode;
  rows: InviteeRow[];
  segment: Segment;
  pending: boolean;
  onDecide: (token: string, d: "approve" | "reject") => void;
  selectionMode: boolean;
  onEnterSelectionMode: () => void;
  onExitSelectionMode: () => void;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectAllVisible: (rows: InviteeRow[], checked: boolean) => void;
  onBulkDecide: (decision: "approve" | "reject") => void;
  onAssign: (volunteerId: string) => void;
  volunteerList: { id: string; name: string; email: string }[];
  bulkBusy: boolean;
}) {
  const decidableVisible = rows.filter(isDecidable);
  const allDecidableSelected =
    decidableVisible.length > 0 && decidableVisible.every((r) => selectedIds.has(r.id));
  const selectedRows = rows.filter((r) => selectedIds.has(r.id));
  const approveCount = selectedRows.filter(isDecidable).length;
  const rejectCount = selectedRows.filter(isRejectable).length;
  const approvedSelectedCount = selectedRows.filter((r) => r.status === "approved").length;

  // Sort state for the CHECKS and DATE columns. Click toggles direction;
  // first click on a column sorts descending (most recent / highest first).
  const [sort, setSort] = useState<{
    col: "checks" | "date";
    dir: "asc" | "desc";
  } | null>(null);

  const onHeaderClick = (col: "checks" | "date") => {
    setSort((prev) => {
      if (!prev || prev.col !== col) return { col, dir: "desc" };
      return { col, dir: prev.dir === "desc" ? "asc" : "desc" };
    });
  };

  const sortedRows = (() => {
    if (!sort) return rows;
    const get = (r: InviteeRow): number => {
      if (sort.col === "checks") return r.refreshCount ?? 0;
      const iso = relevantDate(r);
      return iso ? new Date(iso).getTime() : 0;
    };
    const copy = [...rows];
    copy.sort((a, b) => {
      const diff = get(a) - get(b);
      return sort.dir === "asc" ? diff : -diff;
    });
    return copy;
  })();

  const colCount = selectionMode ? 7 : 6;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex-1">{filterPills}</div>
        {selectionMode ? (
          <Button size="sm" variant="ghost" onClick={onExitSelectionMode} disabled={bulkBusy}>
            Cancel
          </Button>
        ) : (
          <Button size="sm" variant="secondary" onClick={onEnterSelectionMode}>
            Select
          </Button>
        )}
      </div>

      {selectionMode && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-gold/40 bg-gold/5 px-4 py-2">
          <p className="text-sm text-cream">
            <span className="font-semibold text-gold">{selectedIds.size}</span> selected
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              disabled={bulkBusy || approveCount === 0}
              onClick={() => onBulkDecide("approve")}
            >
              {bulkBusy ? "Working..." : `Approve (${approveCount})`}
            </Button>
            {segment !== "admin" && (
              <Button
                size="sm"
                variant="secondary"
                disabled={bulkBusy || rejectCount === 0}
                onClick={() => onBulkDecide("reject")}
              >
                Reject ({rejectCount})
              </Button>
            )}
            <Select
              value=""
              onValueChange={(v) => {
                if (v) onAssign(v);
              }}
              disabled={bulkBusy || approvedSelectedCount === 0 || volunteerList.length === 0}
            >
              <SelectTrigger className="h-8 w-44 [&>span]:min-w-0 [&>span]:truncate">
                <SelectValue
                  placeholder={
                    volunteerList.length === 0
                      ? "No volunteers"
                      : approvedSelectedCount === 0
                        ? "Assign (need approved)"
                        : `Assign ${approvedSelectedCount} →`
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {volunteerList.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.name}
                  </SelectItem>
                ))}
                <SelectItem value="__unassign__">— Unassign —</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-card text-left">
            <tr>
              {selectionMode && (
                <th className="w-px px-4 py-3">
                  <input
                    type="checkbox"
                    className="h-4 w-4 cursor-pointer accent-gold disabled:opacity-30"
                    aria-label="Select all decidable rows"
                    checked={allDecidableSelected}
                    disabled={decidableVisible.length === 0}
                    onChange={(e) => onSelectAllVisible(decidableVisible, e.target.checked)}
                  />
                </th>
              )}
              <th className="px-4 py-3 font-mono text-[11px] tracking-[0.2em] text-cream-40">EMAIL</th>
              <th className="px-4 py-3 font-mono text-[11px] tracking-[0.2em] text-cream-40">NAME</th>
              <th className="px-4 py-3 font-mono text-[11px] tracking-[0.2em] text-cream-40">STATUS</th>
              <SortableHeader
                label="CHECKS"
                col="checks"
                activeCol={sort?.col ?? null}
                dir={sort?.dir ?? null}
                onClick={() => onHeaderClick("checks")}
              />
              <SortableHeader
                label="DATE"
                col="date"
                activeCol={sort?.col ?? null}
                dir={sort?.dir ?? null}
                onClick={() => onHeaderClick("date")}
              />
              <th className="w-px px-4 py-3 font-mono text-[11px] tracking-[0.2em] text-cream-40">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.length === 0 && (
              <tr>
                <td colSpan={colCount} className="px-4 py-8 text-center text-cream-40">
                  Nothing here yet.
                </td>
              </tr>
            )}
            {sortedRows.map((row) => (
              <Row
                key={row.id}
                row={row}
                segment={segment}
                pending={pending}
                onDecide={onDecide}
                selectionMode={selectionMode}
                selected={selectedIds.has(row.id)}
                onToggleSelect={onToggleSelect}
              />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SortableHeader({
  label,
  col,
  activeCol,
  dir,
  onClick,
}: {
  label: string;
  col: "checks" | "date";
  activeCol: "checks" | "date" | null;
  dir: "asc" | "desc" | null;
  onClick: () => void;
}) {
  const active = activeCol === col;
  return (
    <th className="px-4 py-3 font-mono text-[11px] tracking-[0.2em] text-cream-40">
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "flex items-center gap-1 transition-colors hover:text-gold",
          active && "text-gold"
        )}
      >
        <span>{label}</span>
        <span aria-hidden className="font-sans text-[10px]">
          {active ? (dir === "asc" ? "↑" : "↓") : "↕"}
        </span>
      </button>
    </th>
  );
}

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-md border p-4",
        highlight ? "border-gold/40 bg-gold/5" : "border-border bg-card"
      )}
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cream-40">{label}</p>
      <p className={cn("mt-1 text-2xl font-bold", highlight ? "text-gold" : "text-cream")}>{value}</p>
    </div>
  );
}

function Row({
  row,
  segment,
  pending,
  onDecide,
  selectionMode,
  selected,
  onToggleSelect,
}: {
  row: InviteeRow;
  segment: Segment;
  pending: boolean;
  onDecide: (token: string, d: "approve" | "reject") => void;
  selectionMode: boolean;
  selected: boolean;
  onToggleSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  // Pick label set based on the row's actual source (so "All" tab shows correct labels).
  const isAdminInvited = segment === "admin" || (segment === "all" && row.source === "admin");
  const labelMap = isAdminInvited ? adminStatusLabel : portalStatusLabel;
  // Portal "otp_verified" is an incomplete request (no requestData yet) — not decidable.
  const canDecide =
    row.status === "requested" ||
    (row.status === "otp_verified" && row.source !== "portal");
  const emailChanged =
    Boolean(row.originalEmail) &&
    row.originalEmail!.toLowerCase() !== row.email.toLowerCase();
  const hasDetails =
    Boolean(row.formData) ||
    Boolean(row.requestData) ||
    Boolean(row.reason) ||
    Boolean(row.invitedBy) ||
    Boolean(row.decidedBy) ||
    Boolean(row.referralCode) ||
    Boolean(row.assignedVolunteerName) ||
    emailChanged ||
    Boolean(row.refreshCount);

  const decidable = isDecidable(row);
  const colCount = selectionMode ? 7 : 6;

  return (
    <>
      <tr
        className={cn(
          "border-t border-border align-top",
          hasDetails && "cursor-pointer transition-colors hover:bg-card/40"
        )}
        onClick={() => {
          if (hasDetails) setOpen((o) => !o);
        }}
      >
        {selectionMode && (
          <td
            className="w-px px-4 py-3 align-top"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 cursor-pointer accent-gold disabled:cursor-not-allowed disabled:opacity-30"
              checked={selected}
              disabled={!decidable}
              onChange={() => onToggleSelect(row.id)}
              aria-label={
                decidable ? `Select ${row.email}` : `${row.email} is not decidable`
              }
            />
          </td>
        )}
        <td className="px-4 py-3 text-cream">
          <span className="block">{row.email}</span>
          <div className="mt-0.5 flex flex-wrap gap-1">
            {row.originalEmail && row.originalEmail.toLowerCase() !== row.email.toLowerCase() && (
              <span
                className="inline-block rounded bg-amber-500/15 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-amber-700 dark:text-amber-300"
                title={`Originally invited as ${row.originalEmail}`}
              >
                Email changed
              </span>
            )}
            {row.referralCode && (
              <span
                className="inline-block rounded bg-purple-500/15 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-purple-700 dark:text-purple-300"
                title={`Referral code: ${row.referralCode}`}
              >
                ref · {row.referralCode}
              </span>
            )}
            {row.assignedVolunteerName && (
              <span
                className="inline-block rounded bg-emerald-500/15 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-emerald-700 dark:text-emerald-300"
                title={`Assigned to ${row.assignedVolunteerName}`}
              >
                vol · {row.assignedVolunteerName}
              </span>
            )}
          </div>
        </td>
        <td className="px-4 py-3 text-cream-70">{row.name ?? "—"}</td>
        <td className="px-4 py-3">
          <span
            className={cn(
              "inline-block rounded-full px-2 py-0.5 text-xs font-medium",
              statusColors[row.status]
            )}
          >
            {labelMap[row.status]}
          </span>
          {row.status === "otp_verified" &&
            row.autoApproveMode === "delayed" &&
            row.autoApproveAfter && <AutoApproveBadge after={row.autoApproveAfter} />}
          {row.status === "approved" && row.decidedBy === "auto" && (
            <span className="ml-1 inline-block rounded bg-emerald-500/15 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
              auto
            </span>
          )}
        </td>
        <td className="px-4 py-3 text-cream-70">
          {row.refreshCount && row.refreshCount > 0 ? (
            <span
              className="inline-block rounded bg-sky-500/15 px-2 py-0.5 font-mono text-xs text-sky-700 dark:text-sky-300"
              title={
                row.lastRefreshedAt
                  ? `Last checked ${fmtDate(row.lastRefreshedAt) ?? ""}`
                  : undefined
              }
            >
              {row.refreshCount}
            </span>
          ) : (
            <span className="text-cream-40">—</span>
          )}
        </td>
        <td className="px-4 py-3 text-xs text-cream-40">{fmtDate(relevantDate(row)) ?? "—"}</td>
        <td
          className="whitespace-nowrap px-4 py-3"
          onClick={(e) => e.stopPropagation()}
        >
          {canDecide ? (
            <div className="flex gap-2">
              <Button size="sm" disabled={pending} onClick={() => onDecide(row.token, "approve")}>
                Approve
              </Button>
              {!isAdminInvited && (
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={pending}
                  onClick={() => onDecide(row.token, "reject")}
                >
                  Reject
                </Button>
              )}
            </div>
          ) : (
            <span className="text-cream-40">—</span>
          )}
        </td>
      </tr>
      {open && hasDetails && (
        <tr className="border-t border-border bg-card/60">
          <td colSpan={colCount} className="px-4 py-4">
            <dl className="grid gap-3 sm:grid-cols-2">
              {emailChanged && row.originalEmail && (
                <Detail label="Originally invited as" value={row.originalEmail} />
              )}
              {row.referralCode && (
                <Detail label="Referral code" value={row.referralCode} />
              )}
              {row.assignedVolunteerName && (
                <Detail label="Assigned volunteer" value={row.assignedVolunteerName} />
              )}
              {row.refreshCount && row.refreshCount > 0 ? (
                <Detail
                  label="Status checks"
                  value={`${row.refreshCount}${row.lastRefreshedAt ? ` · last ${fmtDate(row.lastRefreshedAt) ?? ""}` : ""}`}
                />
              ) : null}
              {row.invitedBy && (
                <Detail label="Invited by" value={row.invitedBy} />
              )}
              {row.decidedBy && (
                <Detail label="Decided by" value={row.decidedBy} />
              )}
              {row.requestData?.role && (
                <Detail
                  label="Requester"
                  value={row.requestData.role === "student" ? "Student" : "Parent"}
                />
              )}
              {row.requestData?.studentName && (
                <Detail
                  label={row.requestData?.role === "student" ? "About them" : "Student"}
                  value={`${row.requestData.studentName}${row.requestData.studentAge ? `, ${row.requestData.studentAge}` : ""}`}
                />
              )}
              {row.requestData?.parentPhone && (
                <Detail label="Parent's phone" value={row.requestData.parentPhone} />
              )}
              {row.requestData?.studentEmail && (
                <Detail label="Student's email" value={row.requestData.studentEmail} />
              )}
              {row.requestData?.studentPhone && (
                <Detail
                  label={row.requestData?.role === "student" ? "Phone" : "Student's phone"}
                  value={row.requestData.studentPhone}
                />
              )}
              {row.requestData?.school && <Detail label="School" value={row.requestData.school} />}
              {row.requestData?.city && <Detail label="City" value={row.requestData.city} />}
              {row.requestData?.hearAbout && (
                <Detail
                  label="Heard about us"
                  value={
                    row.requestData.hearAbout +
                    (row.requestData.referralFrom ? ` (${row.requestData.referralFrom})` : "")
                  }
                />
              )}
              {row.requestData?.question && (
                <div className="grid gap-0.5 sm:col-span-2">
                  <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-cream-40">
                    Question
                  </dt>
                  <dd className="whitespace-pre-wrap text-sm text-cream-70">
                    {row.requestData.question}
                  </dd>
                </div>
              )}
              {row.formData &&
                Object.entries(row.formData).map(([k, v]) => (
                  <Detail key={k} label={k} value={String(v) || "—"} />
                ))}
            </dl>
          </td>
        </tr>
      )}
    </>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-0.5">
      <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-cream-40">{label}</dt>
      <dd className="text-sm text-cream">{value}</dd>
    </div>
  );
}

function AutoApproveBadge({ after }: { after: string }) {
  const ms = new Date(after).getTime() - Date.now();
  if (ms <= 0) {
    return (
      <span
        className="ml-1 inline-block rounded bg-emerald-500/15 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-emerald-700 dark:text-emerald-300"
        title={`Will auto-approve on next refresh`}
      >
        auto-approving
      </span>
    );
  }
  const mins = Math.ceil(ms / 60000);
  const label = mins >= 60 ? `${Math.ceil(mins / 60)}h` : `${mins}m`;
  return (
    <span
      className="ml-1 inline-block rounded bg-amber-500/15 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-amber-700 dark:text-amber-300"
      title={`Auto-approves in ${label}`}
    >
      auto in {label}
    </span>
  );
}

type AutoApproveMode = "immediate" | "delayed" | "never";

const AUTO_APPROVE_LABELS: Record<AutoApproveMode, string> = {
  never: "Never — require manual approval",
  delayed: "After 2 hours of accepting",
  immediate: "Immediately on accepting",
};

function InviteForm({ onSent }: { onSent: () => void }) {
  const [mode, setMode] = useState<"single" | "import">("single");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [autoApproveMode, setAutoApproveMode] = useState<AutoApproveMode>("never");
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
        body: JSON.stringify({ email, name: name || undefined, autoApproveMode }),
      });
      const json = (await res.json()) as { ok: boolean; message?: string; upgraded?: boolean };
      if (!json.ok) throw new Error(json.message ?? "Could not send invite");
      setFeedback({
        type: "ok",
        message: json.upgraded ? `Upgraded request and sent invite to ${email}` : `Invite sent to ${email}`,
      });
      setEmail("");
      setName("");
      setAutoApproveMode("never");
      onSent();
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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs font-bold tracking-[0.25em] text-gold">
            SEND NEW INVITATION
          </p>
          <p className="mt-1 text-xs text-cream-40">
            Admin-created invites land under the &quot;Admin invited&quot; tab.
          </p>
        </div>
        <div className="flex rounded-md border border-border bg-ink/30 p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setMode("single")}
            className={cn(
              "rounded px-3 py-1.5 font-mono uppercase tracking-wider transition-colors",
              mode === "single" ? "bg-gold/15 text-gold" : "text-cream-40 hover:text-cream-70"
            )}
          >
            Single
          </button>
          <button
            type="button"
            onClick={() => setMode("import")}
            className={cn(
              "rounded px-3 py-1.5 font-mono uppercase tracking-wider transition-colors",
              mode === "import" ? "bg-gold/15 text-gold" : "text-cream-40 hover:text-cream-70"
            )}
          >
            Import from sheet
          </button>
        </div>
      </div>

      {mode === "import" ? (
        <div className="mt-5">
          <ImportInvitesPanel onSent={onSent} />
        </div>
      ) : (
      <>
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
      <div className="mt-4 grid gap-2">
        <Label htmlFor="invite-auto-approve">Auto-approve</Label>
        <Select
          value={autoApproveMode}
          onValueChange={(v) => setAutoApproveMode(v as AutoApproveMode)}
        >
          <SelectTrigger id="invite-auto-approve">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="never">{AUTO_APPROVE_LABELS.never}</SelectItem>
            <SelectItem value="delayed">{AUTO_APPROVE_LABELS.delayed}</SelectItem>
            <SelectItem value="immediate">{AUTO_APPROVE_LABELS.immediate}</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-cream-40">
          The clock starts when the invitee submits the form, not when you send the invite.
        </p>
      </div>
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
      </>
      )}
    </section>
  );
}
