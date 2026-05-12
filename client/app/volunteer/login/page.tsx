import { redirect } from "next/navigation";
import { CodeInLogo } from "@/components/codein-logo";
import { VolunteerLoginForm } from "@/components/volunteer-login-form";
import { getVolunteerEmail } from "@/lib/volunteer-auth";

export const dynamic = "force-dynamic";

export default async function VolunteerLoginPage() {
  if (await getVolunteerEmail()) redirect("/volunteer/dashboard");

  return (
    <main className="flex min-h-screen items-center justify-center bg-ink p-6">
      <div className="w-full max-w-md space-y-8">
        <div className="flex justify-center">
          <CodeInLogo height={28} />
        </div>
        <div className="rounded-lg border border-border bg-card/40 p-6 md:p-8">
          <p className="font-mono text-xs font-bold tracking-[0.25em] text-gold">VOLUNTEER</p>
          <h1 className="mt-2 font-heading text-3xl font-bold text-cream">Sign in</h1>
          <p className="mt-2 text-sm text-cream-70">
            Use the email and password your admin shared with you.
          </p>
          <div className="mt-6">
            <VolunteerLoginForm />
          </div>
        </div>
      </div>
    </main>
  );
}
