import { notFound } from "next/navigation";
import Link from "next/link";
import { invitees } from "@/lib/db";
import { content } from "@/lib/content";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { EventDetails } from "@/components/event-details";
import { RegisterFlow } from "@/components/register-flow";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function RegisterPage({ params }: PageProps) {
  const { token } = await params;
  const col = await invitees();
  const doc = await col.findOne({ token });

  if (!doc) notFound();

  const { register } = content;

  if (doc.status === "approved") {
    return <FinalScreen variant="confirmed" />;
  }
  if (doc.status === "rejected") {
    return (
      <Shell
        label="REGISTRATION CLOSED"
        title={register.finalisedTitle}
        body={register.finalisedBody}
      />
    );
  }
  if (doc.status === "otp_verified") {
    return <FinalScreen variant="waitlist" />;
  }

  return (
    <main className="min-h-screen bg-ink">
      <SiteHeader label={register.label} title={register.title} intro={register.intro} />

      <section className="container max-w-4xl py-12 md:py-20">
        <div className="grid gap-12 md:grid-cols-[1fr_280px] md:gap-16">
          <div className="animate-fade-up">
            <RegisterFlow token={token} email={doc.email} name={doc.name} />
          </div>
          <div className="md:sticky md:top-12 md:self-start">
            <EventDetails />
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}

function Shell({ label, title, body }: { label: string; title: string; body: string }) {
  return (
    <main className="min-h-screen bg-ink">
      <SiteHeader label={label} title={title} intro={body} />
      <SiteFooter />
    </main>
  );
}

function FinalScreen({ variant }: { variant: "waitlist" | "confirmed" }) {
  const block = variant === "waitlist" ? content.waitlist : content.confirmation;
  return (
    <main className="flex min-h-screen flex-col bg-ink">
      <section className="flex-1 border-b border-border">
        <div className="container max-w-2xl py-16 md:py-24">
          <div className="animate-fade-up">
            <p className="font-mono text-xs font-bold tracking-[0.25em] text-gold">{block.label}</p>
            <h1 className="mt-3 text-balance font-heading text-4xl font-bold leading-tight text-cream md:text-5xl">
              {block.title}
            </h1>
            <p className="mt-5 max-w-lg font-sans text-base text-cream-70 md:text-lg">
              {block.body}
            </p>
            <div className="mt-10 rounded-md border border-border bg-card p-6 md:p-8">
              <p className="font-mono text-xs font-bold tracking-[0.25em] text-gold">
                {block.nextStepsTitle.toUpperCase()}
              </p>
              <ol className="mt-4 space-y-3">
                {block.nextSteps.map((step, idx) => (
                  <li key={idx} className="flex gap-3 font-sans text-sm text-cream md:text-base">
                    <span className="font-mono text-xs font-bold text-cream-40">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
            <Link
              href="/"
              className="mt-10 inline-flex items-center gap-2 font-sans text-sm text-cream-70 transition-colors hover:text-gold"
            >
              ← {block.backLink}
            </Link>
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
