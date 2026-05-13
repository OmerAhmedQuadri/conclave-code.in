export const dynamic = "force-dynamic";

export default function AdminMarketingPage() {
  return (
    <main className="container max-w-5xl space-y-8 py-10 md:py-14">
      <div>
        <p className="font-mono text-xs font-bold tracking-[0.25em] text-gold">MARKETING</p>
        <h1 className="mt-2 font-heading text-3xl font-bold text-cream">Marketing</h1>
        <p className="mt-2 text-sm text-cream-70">
          Tools and reports for outreach campaigns will live here.
        </p>
      </div>

      <div className="rounded-md border border-border bg-card p-6">
        <p className="font-mono text-xs font-bold tracking-[0.25em] text-cream-40">COMING SOON</p>
        <p className="mt-2 text-sm text-cream-70">
          Nothing wired up yet. Tell us what you&rsquo;d like to see here — campaign tracking, link
          generators, referral analytics, etc.
        </p>
      </div>
    </main>
  );
}
