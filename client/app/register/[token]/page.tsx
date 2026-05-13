import { notFound } from "next/navigation";
import Link from "next/link";
import { invitees } from "@/lib/db";
import { content } from "@/lib/content";
import { FELogo } from "@/components/fe-logo";
import { CodeInLogo } from "@/components/codein-logo";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { EventDetails } from "@/components/event-details";
import { RegisterFlow } from "@/components/register-flow";
import { CheckStatusPageClient } from "@/components/check-status-page-client";

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

  if (doc.status === "rejected") {
    return (
      <Shell
        label="REGISTRATION CLOSED"
        title={register.finalisedTitle}
        body={register.finalisedBody}
      />
    );
  }
  if (doc.status === "approved" || doc.status === "otp_verified") {
    return <StatusShell />;
  }

  return (
    <main className="flex min-h-screen flex-col bg-ink">
      <header className="border-b border-border">
        <div className="container max-w-6xl py-6">
          <Link href="/" className="inline-flex items-center gap-4">
            <FELogo size={48} className="shrink-0" />
            <div className="h-8 w-px bg-border" aria-hidden />
            <CodeInLogo height={22} />
          </Link>
        </div>
      </header>

      <section className="flex-1">
        <div className="container max-w-4xl py-12 md:py-20">
          <div className="grid gap-12 lg:grid-cols-[1fr_280px] lg:gap-16">
            <div className="animate-fade-up">
              <RegisterFlow token={token} email={doc.email} name={doc.name} />
            </div>
            <div className="lg:sticky lg:top-12 lg:self-start">
              <EventDetails />
            </div>
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

function StatusShell() {
  return (
    <main className="flex min-h-screen flex-col bg-ink">
      <header className="border-b border-border">
        <div className="container max-w-6xl py-6">
          <Link href="/" className="inline-flex items-center gap-4">
            <FELogo size={48} className="shrink-0" />
            <div className="h-8 w-px bg-border" aria-hidden />
            <CodeInLogo height={22} />
          </Link>
        </div>
      </header>

      <section className="flex-1">
        <div className="container max-w-2xl py-12 md:py-20">
          <div className="rounded-lg border border-border bg-card/40 p-6 md:p-10">
            <CheckStatusPageClient />
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
