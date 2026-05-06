import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { EventDetails } from "@/components/event-details";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import {
  AboutSection,
  ForWhomSection,
  SpeakersSection,
  FormatSection,
  FaqSection,
} from "@/components/landing-sections";
import { content } from "@/lib/content";
import { whatsappLink, siteConfig } from "@/lib/config";

export default function Page() {
  const { landing } = content;

  return (
    <main className="min-h-screen bg-ink">
      <SiteHeader label={landing.label} title={landing.title} intro={landing.intro} />

      <section className="border-b border-border">
        <div className="container max-w-4xl py-12 md:py-16">
          <div className="grid gap-10 md:grid-cols-[1fr_280px] md:gap-16">
            <div className="max-w-xl animate-fade-up space-y-6">
              <p className="font-sans text-base text-cream-70 md:text-lg">{landing.note}</p>
              <div className="flex flex-wrap items-center gap-3">
                <Button asChild size="lg">
                  <Link href="/request-invite">{landing.primaryCta}</Link>
                </Button>
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-5 py-3 font-sans text-sm text-cream transition-colors hover:border-gold/60"
                >
                  WhatsApp · {siteConfig.whatsappNumber} →
                </a>
              </div>
              <p className="font-mono text-xs tracking-wider text-cream-40">
                {landing.secondaryCta} — use the link in your email.
              </p>
            </div>

            <div className="md:sticky md:top-12 md:self-start">
              <EventDetails />
            </div>
          </div>
        </div>
      </section>

      <AboutSection />
      <ForWhomSection />
      <SpeakersSection />
      <FormatSection />
      <FaqSection />

      <section className="border-b border-border">
        <div className="container max-w-4xl py-16 text-center md:py-20">
          <p className="font-mono text-xs font-bold tracking-[0.25em] text-gold">{landing.label}</p>
          <h2 className="mt-3 text-balance font-heading text-3xl font-bold leading-tight text-cream md:text-4xl">
            {landing.closingTitle}
          </h2>
          <p className="mx-auto mt-4 max-w-xl font-sans text-base text-cream-70">
            {landing.closingBody}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/request-invite">{landing.primaryCta}</Link>
            </Button>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
