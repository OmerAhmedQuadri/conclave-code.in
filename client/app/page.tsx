import { FELogo } from "@/components/fe-logo";
import { CodeInLogo } from "@/components/codein-logo";
import { EventDetails } from "@/components/event-details";
import { SiteFooter } from "@/components/site-footer";
import { HomeFormCard } from "@/components/home-form-card";
import {
  AboutSection,
  ForWhomSection,
  SpeakersSection,
  FormatSection,
  FaqSection,
} from "@/components/landing-sections";
import { content } from "@/lib/content";

export default function Page() {
  const { landing } = content;

  return (
    <main className="min-h-screen bg-ink">
      {/* Hero with embedded form on the right */}
      <section className="border-b border-border">
        <div className="container max-w-6xl py-12 md:py-20">
          <div className="grid gap-12 lg:grid-cols-[1fr_440px] lg:items-start lg:gap-16">
            <div className="animate-fade-up">
              <div className="flex items-center gap-4">
                <FELogo size={72} className="shrink-0" />
                <div className="h-10 w-px bg-border" aria-hidden />
                <CodeInLogo height={28} />
              </div>
              <p className="mt-10 font-mono text-xs font-bold tracking-[0.25em] text-gold">
                {landing.label}
              </p>
              <h1 className="mt-3 whitespace-pre-line text-balance font-heading text-4xl font-bold leading-tight text-cream md:text-5xl lg:text-6xl">
                {landing.title}
              </h1>
              <p className="mt-5 max-w-xl font-sans text-base text-cream-70 md:text-lg">
                {landing.intro}
              </p>
              <div className="mt-6 flex flex-col items-start gap-1 font-mono text-xs uppercase tracking-wider text-cream-70 sm:flex-row sm:items-center sm:gap-3">
                <span className="font-bold text-gold">{content.brand.eventName}</span>
                <span className="hidden text-cream-40 sm:inline" aria-hidden>
                  ·
                </span>
                <span>{content.brand.chapter}</span>
              </div>
              <p className="mt-8 max-w-lg font-sans text-sm text-cream-70 md:text-base">
                {landing.note}
              </p>
              <p className="mt-5 font-mono text-xs tracking-wider text-cream-40">
                {landing.secondaryCta} — use the link in your email.
              </p>
            </div>

            <div className="lg:sticky lg:top-12 lg:self-start">
              <HomeFormCard
                requestLabel={content.request.label}
                requestTitle="Tell us a little about your family."
                requestIntro={content.request.intro}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Event details strip */}
      <section className="border-b border-border bg-card/30">
        <div className="container max-w-6xl py-8">
          <EventDetails />
        </div>
      </section>

      <AboutSection />
      <ForWhomSection />
      <SpeakersSection />
      <FormatSection />
      <FaqSection />

      <SiteFooter />
    </main>
  );
}
