import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin-auth";
import { AdminLoginForm } from "@/components/admin-login-form";
import { CodeInLogo } from "@/components/codein-logo";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  if (await isAdmin()) redirect("/admin");

  return (
    <main className="min-h-screen bg-ink flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex justify-center">
          <CodeInLogo height={28} />
        </div>
        <div className="text-center">
          <p className="font-mono text-xs font-bold tracking-[0.25em] text-gold">
            ADMIN
          </p>
          <h1 className="mt-2 font-heading text-3xl font-bold text-cream">Sign in</h1>
        </div>
        <AdminLoginForm />
      </div>
    </main>
  );
}
