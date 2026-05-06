import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { EventDetails } from "@/components/event-details";
import { RequestInviteForm } from "@/components/request-invite-form";
import { content } from "@/lib/content";

export default function RequestInvitePage() {
  const { request } = content;

  return (
    <main className="min-h-screen bg-ink">
      <SiteHeader label={request.label} title={request.title} intro={request.intro} />

      <section className="container max-w-4xl py-12 md:py-20">
        <div className="grid gap-12 md:grid-cols-[1fr_280px] md:gap-16">
          <div className="animate-fade-up">
            <RequestInviteForm />
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
