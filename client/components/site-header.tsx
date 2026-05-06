import { FELogo } from "@/components/fe-logo";
import { CodeInLogo } from "@/components/codein-logo";
import { content } from "@/lib/content";

interface SiteHeaderProps {
  label: string;
  title: string;
  intro?: string;
}

export function SiteHeader({ label, title, intro }: SiteHeaderProps) {
  return (
    <section className="border-b border-border">
      <div className="container max-w-4xl py-12 md:py-20">
        <div className="flex items-center gap-4">
          <FELogo size={72} className="shrink-0" />
          <div className="h-10 w-px bg-border" aria-hidden />
          <CodeInLogo height={28} />
        </div>

        <div className="mt-10">
          <p className="font-mono text-xs font-bold tracking-[0.25em] text-gold">
            {label}
          </p>
          <h1 className="mt-3 whitespace-pre-line font-heading text-4xl font-bold leading-tight text-cream text-balance md:text-5xl lg:text-6xl">
            {title}
          </h1>
          {intro && (
            <p className="mt-5 max-w-xl font-sans text-base text-cream-70 md:text-lg">
              {intro}
            </p>
          )}
          <div className="mt-6 flex flex-col items-start gap-1 font-mono text-xs uppercase tracking-wider text-cream-70 sm:flex-row sm:items-center sm:gap-3">
            <span className="font-bold text-gold">{content.brand.eventName}</span>
            <span className="hidden sm:inline text-cream-40" aria-hidden>·</span>
            <span>{content.brand.chapter}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
