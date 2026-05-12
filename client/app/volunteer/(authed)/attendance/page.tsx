import { AttendanceScanner } from "@/components/attendance-scanner";

export const dynamic = "force-dynamic";

export default function VolunteerAttendancePage() {
  return (
    <main className="container max-w-3xl space-y-8 py-10 md:py-14">
      <div>
        <p className="font-mono text-xs font-bold tracking-[0.25em] text-gold">ATTENDANCE</p>
        <h1 className="mt-2 font-heading text-3xl font-bold text-cream">Check guests in</h1>
        <p className="mt-2 text-sm text-cream-70">
          Scan the entry QR from a guest&rsquo;s confirmation email to mark them attended. Works
          for any approved guest, not just those assigned to you.
        </p>
      </div>
      <AttendanceScanner />
    </main>
  );
}
