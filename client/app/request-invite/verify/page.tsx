import Link from "next/link";
import { FELogo } from "@/components/fe-logo";
import { CodeInLogo } from "@/components/codein-logo";
import { SiteFooter } from "@/components/site-footer";
import { RequestInviteVerifyFlow } from "@/components/request-invite-verify";

export const dynamic = "force-dynamic";

export default function RequestInviteVerifyPage() {
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
            <RequestInviteVerifyFlow />
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
