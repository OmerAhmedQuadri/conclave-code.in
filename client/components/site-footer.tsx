import { content } from "@/lib/content";
import { siteConfig, whatsappLink } from "@/lib/config";
import { CodeInLogo } from "@/components/codein-logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="container max-w-4xl py-10 md:py-12">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <CodeInLogo height={26} />
            <p className="mt-3 max-w-md font-sans text-sm text-cream-70">
              {content.footer.tagline}
            </p>
          </div>

          <div className="flex flex-col gap-2 text-sm md:items-end">
            <p className="font-mono text-[10px] font-bold tracking-[0.25em] text-cream-40">
              {content.footer.contactLabel.toUpperCase()}
            </p>
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="font-sans text-cream transition-colors hover:text-gold"
            >
              WhatsApp {siteConfig.whatsappNumber}
            </a>
          </div>
        </div>

        <p className="mt-10 font-mono text-[10px] tracking-[0.2em] text-cream-40">
          {content.footer.legal.toUpperCase()}
        </p>
      </div>
    </footer>
  );
}
