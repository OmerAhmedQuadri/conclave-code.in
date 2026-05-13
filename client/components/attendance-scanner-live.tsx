"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
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

interface MarkOk {
  ok: true;
  invitee: { id: string; email: string; name?: string; attendedAt: string };
}
interface MarkFail {
  ok: false;
  alreadyAttended?: boolean;
  message?: string;
  invitee?: { email: string; name?: string; attendedAt?: string; attendedByName?: string | null };
}
type MarkResponse = MarkOk | MarkFail;

type ToastKind = "success" | "warning" | "error";
type Toast = { kind: ToastKind; title: string; subtitle?: string } | null;

interface Camera {
  id: string;
  label: string;
}

const SCANNER_ID = "fec-attendance-scanner-live";
const REAR_LABEL_RE = /\b(back|rear|environment)\b/i;
const FRONT_LABEL_RE = /\b(front|user|face|selfie)\b/i;
const QUALIFIER_RE = /\b(ultra|wide|tele|telephoto|macro|depth|mono|monochrome|infrared|ir)\b/i;

function pickRearCameraIndex(cameras: Camera[]): number {
  if (cameras.length === 0) return -1;
  const android0Rear = cameras.findIndex(
    (c) => /\bcamera2\s*0\b/i.test(c.label) && REAR_LABEL_RE.test(c.label)
  );
  if (android0Rear !== -1) return android0Rear;
  const cleanRear = cameras.findIndex(
    (c) => REAR_LABEL_RE.test(c.label) && !QUALIFIER_RE.test(c.label)
  );
  if (cleanRear !== -1) return cleanRear;
  const anyRear = cameras.findIndex((c) => REAR_LABEL_RE.test(c.label));
  if (anyRear !== -1) return anyRear;
  const nonFront = cameras.findIndex((c) => !FRONT_LABEL_RE.test(c.label));
  if (nonFront !== -1) return nonFront;
  return 0;
}

export function AttendanceScannerLive() {
  const router = useRouter();
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [starting, setStarting] = useState(true);
  const [scannerReady, setScannerReady] = useState(false);
  const [pending, setPending] = useState<LookupOk["invitee"] | null>(null);
  const [marking, setMarking] = useState(false);
  const [toast, setToast] = useState<Toast>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  // Pause scans while the confirmation modal is open. A ref is used (not state)
  // so the scanner callback closes over the latest value without re-binding.
  const pausedRef = useRef(false);
  const lastScannedRef = useRef<{ token: string; at: number } | null>(null);

  // Lock body scroll while we're in the full-screen scan view.
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    const prevOverscroll = document.body.style.overscrollBehavior;
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "contain";
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.overscrollBehavior = prevOverscroll;
    };
  }, []);

  // Toast auto-dismiss
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  // Enumerate cameras once on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let browserPickedDeviceId: string | null = null;
        try {
          const tempStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: "environment" } },
            audio: false,
          });
          const track = tempStream.getVideoTracks()[0];
          if (track) {
            const settings = track.getSettings();
            if (settings.deviceId) browserPickedDeviceId = settings.deviceId;
          }
          tempStream.getTracks().forEach((t) => t.stop());
        } catch (err) {
          if (cancelled) return;
          const message = err instanceof Error ? err.message : String(err);
          setToast({
            kind: "error",
            title: "Could not access camera",
            subtitle: /permission|denied|notallowed/i.test(message)
              ? "Camera permission was denied. Allow access in your browser settings and try again."
              : message,
          });
          setStarting(false);
          return;
        }

        const enumerated = await Html5Qrcode.getCameras().catch(() => []);
        if (cancelled) return;
        const list = enumerated.map((c) => ({ id: c.id, label: c.label || "Camera" }));
        if (list.length === 0) {
          setToast({ kind: "error", title: "No camera detected on this device." });
          setStarting(false);
          return;
        }

        let initialIdx = -1;
        if (browserPickedDeviceId) {
          initialIdx = list.findIndex((c) => c.id === browserPickedDeviceId);
        }
        if (initialIdx === -1) initialIdx = pickRearCameraIndex(list);

        setCameras(list);
        setCurrentIdx(initialIdx);
        setStarting(false);
      } catch {
        if (!cancelled) setStarting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const lookup = useCallback(async (token: string) => {
    pausedRef.current = true;
    try {
      const res = await fetch(
        `/api/volunteer/attendance/lookup?token=${encodeURIComponent(token)}`
      );
      const json = (await res.json()) as LookupResponse;
      if (!json.ok) {
        setToast({ kind: "error", title: json.message ?? "Could not look up this QR." });
        pausedRef.current = false;
        return;
      }
      // Already attended or not approved: surface as warning toast, no modal.
      if (json.invitee.attendedAt) {
        setToast({
          kind: "warning",
          title: `Already checked in${
            json.invitee.attendedByName ? ` by ${json.invitee.attendedByName}` : ""
          }`,
          subtitle: json.invitee.name ?? json.invitee.email,
        });
        pausedRef.current = false;
        return;
      }
      if (json.invitee.status !== "approved") {
        setToast({
          kind: "warning",
          title: `Not on the approved list (status: ${json.invitee.status})`,
          subtitle: json.invitee.email,
        });
        pausedRef.current = false;
        return;
      }
      setPending(json.invitee);
      // Stay paused — confirm/cancel will resume.
    } catch (err) {
      setToast({
        kind: "error",
        title: err instanceof Error ? err.message : "Something went wrong",
      });
      pausedRef.current = false;
    }
  }, []);

  // Start/stop the scanner whenever the camera selection changes.
  useEffect(() => {
    if (starting) return;
    if (cameras.length === 0) return;
    const cam = cameras[currentIdx];
    if (!cam) return;

    let cancelled = false;
    const scanner = new Html5Qrcode(SCANNER_ID, /* verbose */ false);
    scannerRef.current = scanner;
    setScannerReady(false);

    scanner
      .start(
        { deviceId: { exact: cam.id } },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decodedText: string) => {
          if (pausedRef.current) return;
          const now = Date.now();
          const last = lastScannedRef.current;
          if (last && last.token === decodedText && now - last.at < 3000) return;
          lastScannedRef.current = { token: decodedText, at: now };
          void lookup(decodedText);
        },
        () => {
          /* per-frame failure — ignore */
        }
      )
      .then(() => {
        if (!cancelled) setScannerReady(true);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : String(err);
        setToast({ kind: "error", title: "Could not start camera", subtitle: message });
      });

    return () => {
      cancelled = true;
      const s = scannerRef.current;
      scannerRef.current = null;
      if (s && s.isScanning) {
        s.stop()
          .then(() => s.clear())
          .catch(() => {});
      }
    };
  }, [starting, currentIdx, cameras, lookup]);

  const switchCamera = () => {
    if (cameras.length < 2) return;
    setCurrentIdx((i) => (i + 1) % cameras.length);
  };

  const exit = () => {
    router.push("/volunteer/attendance");
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
        setToast({ kind: "success", title: `Checked in: ${display}`, subtitle: json.invitee.email });
      } else if (json.alreadyAttended) {
        setToast({
          kind: "warning",
          title: json.message ?? "Already checked in.",
          subtitle: json.invitee?.email,
        });
      } else {
        setToast({
          kind: "error",
          title: json.message ?? "Could not check in.",
          subtitle: json.invitee?.email,
        });
      }
    } catch (err) {
      setToast({
        kind: "error",
        title: err instanceof Error ? err.message : "Something went wrong",
      });
    } finally {
      setMarking(false);
      setPending(null);
      pausedRef.current = false;
    }
  };

  const cancelMark = () => {
    setPending(null);
    pausedRef.current = false;
  };

  const currentCam = cameras[currentIdx];

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-ink">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-card/80 px-4 py-3 backdrop-blur">
        <p className="font-mono text-xs font-bold tracking-[0.25em] text-gold">SCAN QR</p>
        <div className="flex items-center gap-2">
          {cameras.length > 1 && (
            <Button size="sm" variant="secondary" onClick={switchCamera} disabled={marking}>
              Switch
            </Button>
          )}
          <Button size="sm" onClick={exit} disabled={marking}>
            Exit
          </Button>
        </div>
      </div>

      <div className="relative flex-1 overflow-hidden">
        <div id={SCANNER_ID} className="absolute inset-0 h-full w-full" />
        {starting && (
          <div className="absolute inset-0 flex items-center justify-center font-mono text-xs uppercase tracking-[0.2em] text-cream-40">
            Starting camera...
          </div>
        )}
        {!starting && !scannerReady && cameras.length > 0 && (
          <div className="absolute inset-0 flex items-center justify-center font-mono text-xs uppercase tracking-[0.2em] text-cream-40">
            Connecting...
          </div>
        )}
      </div>

      {currentCam && (
        <p className="bg-card/80 px-4 py-2 text-center text-xs text-cream-40 backdrop-blur">
          Using <span className="text-cream-70">{currentCam.label}</span>
          {cameras.length > 1 && ` · ${currentIdx + 1} of ${cameras.length}`}
        </p>
      )}

      {toast && (
        <div
          className={cn(
            "border-t px-4 py-3 text-sm",
            toast.kind === "success" &&
              "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
            toast.kind === "warning" &&
              "border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-300",
            toast.kind === "error" && "border-destructive/40 bg-destructive/15 text-destructive"
          )}
          role={toast.kind === "error" ? "alert" : "status"}
        >
          <p className="font-semibold">{toast.title}</p>
          {toast.subtitle && <p className="mt-0.5 text-xs opacity-80">{toast.subtitle}</p>}
        </div>
      )}

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
