"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface MarkResponseOk {
  ok: true;
  invitee: {
    id: string;
    email: string;
    name?: string;
    role?: "student" | "parent";
    studentName?: string;
    attendedAt: string;
  };
}

interface MarkResponseFail {
  ok: false;
  alreadyAttended?: boolean;
  message?: string;
  invitee?: {
    email: string;
    name?: string;
    attendedAt?: string;
    attendedByName?: string | null;
  };
}

type ResultBanner =
  | { kind: "success"; title: string; subtitle?: string }
  | { kind: "warning"; title: string; subtitle?: string }
  | { kind: "error"; title: string; subtitle?: string }
  | null;

interface Camera {
  id: string;
  label: string;
}

const SCANNER_ID = "fec-attendance-scanner";
const REAR_LABEL_RE = /\b(back|rear|environment)\b/i;
const FRONT_LABEL_RE = /\b(front|user|face|selfie)\b/i;
// Qualifier keywords that mark a non-default back camera on Android phones
// (ultrawide, telephoto, macro, depth, monochrome, etc.). The "main" rear lens
// usually has none of these.
const QUALIFIER_RE = /\b(ultra|wide|tele|telephoto|macro|depth|mono|monochrome|infrared|ir)\b/i;

/**
 * Pick the rear-facing camera most likely to be the standard 1× lens.
 * Strategy: exclude qualifier-labelled lenses, prefer Android's `camera2 0`
 * (which is conventionally the main rear), and finally fall back to "any rear"
 * → "any non-front" → "first listed".
 */
function pickRearCameraIndex(cameras: Camera[]): number {
  if (cameras.length === 0) return -1;

  // Android Chrome: "camera2 0, facing back" is usually the main rear lens
  const android0Rear = cameras.findIndex(
    (c) => /\bcamera2\s*0\b/i.test(c.label) && REAR_LABEL_RE.test(c.label)
  );
  if (android0Rear !== -1) return android0Rear;

  // Rear camera without an ultra/tele/macro qualifier
  const cleanRear = cameras.findIndex(
    (c) => REAR_LABEL_RE.test(c.label) && !QUALIFIER_RE.test(c.label)
  );
  if (cleanRear !== -1) return cleanRear;

  // Any rear camera at all
  const anyRear = cameras.findIndex((c) => REAR_LABEL_RE.test(c.label));
  if (anyRear !== -1) return anyRear;

  // Skip anything explicitly front-facing
  const nonFront = cameras.findIndex((c) => !FRONT_LABEL_RE.test(c.label));
  if (nonFront !== -1) return nonFront;

  return 0;
}

export function AttendanceScanner() {
  const [scanning, setScanning] = useState(false);
  const [starting, setStarting] = useState(false);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [busy, setBusy] = useState(false);
  const [manualToken, setManualToken] = useState("");
  const [result, setResult] = useState<ResultBanner>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScannedRef = useRef<{ token: string; at: number } | null>(null);

  const markAttendance = async (token: string) => {
    if (!token) return;
    setBusy(true);
    try {
      const res = await fetch("/api/volunteer/attendance/mark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const json = (await res.json()) as MarkResponseOk | MarkResponseFail;
      if (json.ok) {
        const display = json.invitee.name ?? json.invitee.email;
        const subject =
          json.invitee.role === "parent" && json.invitee.studentName
            ? ` (student: ${json.invitee.studentName})`
            : "";
        setResult({
          kind: "success",
          title: `Checked in: ${display}${subject}`,
          subtitle: json.invitee.email,
        });
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
      setBusy(false);
    }
  };

  /**
   * Start scan flow:
   *   1. If we don't yet know the camera list, do a one-shot generic stream so
   *      the browser grants permission (otherwise getCameras() returns blank
   *      labels and we can't identify the rear lens).
   *   2. Enumerate via Html5Qrcode.getCameras().
   *   3. Pick the rear camera by label and start scanning by deviceId.
   */
  const startScanner = async () => {
    setResult(null);
    setStarting(true);
    try {
      let camList = cameras;
      // The browser's choice of "default rear" when we ask via facingMode.
      // We use this as the starting deviceId — it's far more reliable than
      // label parsing on phones with multiple back lenses.
      let browserPickedDeviceId: string | null = null;

      if (camList.length === 0) {
        // 1. Trigger permission AND let the browser pick its idea of "back".
        //    Using `ideal` (not `exact`) so the call doesn't fail on devices
        //    with only a front camera.
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
          const message = err instanceof Error ? err.message : String(err);
          setResult({
            kind: "error",
            title: "Could not access camera",
            subtitle:
              /permission|denied|notallowed/i.test(message)
                ? "Camera permission was denied. Allow access in your browser settings and try again."
                : message,
          });
          setStarting(false);
          return;
        }

        // 2. Enumerate after permission so labels are populated.
        const enumerated = await Html5Qrcode.getCameras().catch(() => []);
        camList = enumerated.map((c) => ({ id: c.id, label: c.label || "Camera" }));
        if (camList.length === 0) {
          setResult({ kind: "error", title: "No camera detected on this device." });
          setStarting(false);
          return;
        }
        setCameras(camList);

        // 3. Prefer the deviceId the browser handed us (it knows the device
        //    better than label heuristics). Fall back to label parsing.
        let initialIdx = -1;
        if (browserPickedDeviceId) {
          initialIdx = camList.findIndex((c) => c.id === browserPickedDeviceId);
        }
        if (initialIdx === -1) initialIdx = pickRearCameraIndex(camList);
        setCurrentIdx(initialIdx);
      }
      setScanning(true);
    } finally {
      setStarting(false);
    }
  };

  // While the scanner overlay is open, lock the body scroll so the page
  // behind doesn't move when the volunteer drags on the camera area.
  useEffect(() => {
    if (!scanning) return;
    const prevOverflow = document.body.style.overflow;
    const prevOverscroll = document.body.style.overscrollBehavior;
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "contain";
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.overscrollBehavior = prevOverscroll;
    };
  }, [scanning]);

  // Lifecycle: start/stop the actual scanner whenever scanning becomes true,
  // or the selected camera changes.
  useEffect(() => {
    if (!scanning) return;
    if (cameras.length === 0) return;
    const cam = cameras[currentIdx];
    if (!cam) return;

    let cancelled = false;
    const scanner = new Html5Qrcode(SCANNER_ID, /* verbose */ false);
    scannerRef.current = scanner;

    scanner
      .start(
        { deviceId: { exact: cam.id } },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decodedText: string) => {
          const now = Date.now();
          const last = lastScannedRef.current;
          if (last && last.token === decodedText && now - last.at < 3000) return;
          lastScannedRef.current = { token: decodedText, at: now };
          void markAttendance(decodedText);
        },
        () => {
          /* per-frame failure callback — ignore */
        }
      )
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : String(err);
        setResult({
          kind: "error",
          title: "Could not start camera",
          subtitle: message,
        });
        setScanning(false);
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
  }, [scanning, currentIdx, cameras]);

  const switchCamera = () => {
    if (cameras.length < 2) return;
    setCurrentIdx((i) => (i + 1) % cameras.length);
  };

  const stopScanner = () => {
    setScanning(false);
  };

  const onManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualToken.trim()) return;
    await markAttendance(manualToken.trim());
    setManualToken("");
  };

  const isSecure =
    typeof window === "undefined" ||
    window.isSecureContext ||
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";

  const currentCam = cameras[currentIdx];
  const currentCamLabel =
    currentCam?.label ||
    (currentIdx === pickRearCameraIndex(cameras) ? "rear" : `camera ${currentIdx + 1}`);

  // ─── Full-screen scanner overlay ────────────────────────────────────────
  // When scanning is active we take over the viewport entirely so the
  // volunteer isn't fighting other UI on a phone. Tap "Exit" to return.
  if (scanning) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col bg-ink">
        <div className="flex items-center justify-between gap-3 border-b border-border bg-card/80 px-4 py-3 backdrop-blur">
          <p className="font-mono text-xs font-bold tracking-[0.25em] text-gold">SCAN QR</p>
          <div className="flex items-center gap-2">
            {cameras.length > 1 && (
              <Button
                size="sm"
                variant="secondary"
                onClick={switchCamera}
                disabled={busy}
              >
                Switch
              </Button>
            )}
            <Button size="sm" onClick={stopScanner} disabled={busy}>
              Exit
            </Button>
          </div>
        </div>

        <div className="relative flex-1 overflow-hidden">
          <div id={SCANNER_ID} className="absolute inset-0 h-full w-full" />
        </div>

        {currentCam && (
          <p className="bg-card/80 px-4 py-2 text-center text-xs text-cream-40 backdrop-blur">
            Using <span className="text-cream-70">{currentCamLabel}</span>
            {cameras.length > 1 && ` · ${currentIdx + 1} of ${cameras.length}`}
          </p>
        )}

        {result && (
          <div
            className={cn(
              "border-t px-4 py-3 text-sm",
              result.kind === "success" &&
                "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
              result.kind === "warning" &&
                "border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-300",
              result.kind === "error" && "border-destructive/40 bg-destructive/15 text-destructive"
            )}
            role={result.kind === "error" ? "alert" : "status"}
          >
            <p className="font-semibold">{result.title}</p>
            {result.subtitle && <p className="mt-0.5 text-xs opacity-80">{result.subtitle}</p>}
          </div>
        )}
      </div>
    );
  }

  // ─── Normal layout (idle) ───────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="rounded-md border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-xs font-bold tracking-[0.25em] text-gold">SCAN QR</p>
            <p className="mt-1 text-sm text-cream-70">
              Point the camera at the guest&rsquo;s entry QR. We&rsquo;ll check them in automatically.
            </p>
          </div>
          <Button size="sm" onClick={startScanner} disabled={busy || starting}>
            {starting ? "Starting..." : "Start scanner"}
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
          If the camera isn&rsquo;t working, paste the QR token (or paste the URL it points to).
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="grid flex-1 gap-2">
            <Label htmlFor="manual-token">Token or URL</Label>
            <Input
              id="manual-token"
              value={manualToken}
              onChange={(e) => setManualToken(e.target.value)}
              placeholder="abcd1234..."
              disabled={busy}
            />
          </div>
          <Button type="submit" disabled={busy || manualToken.trim().length === 0}>
            Check in
          </Button>
        </div>
      </form>
    </div>
  );
}
