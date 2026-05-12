import { redirect } from "next/navigation";
import { getCurrentVolunteer } from "@/lib/volunteer-auth";
import { VolunteerHeader } from "@/components/volunteer-header";

export const dynamic = "force-dynamic";

export default async function AuthedVolunteerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const me = await getCurrentVolunteer();
  if (!me) redirect("/volunteer/login");

  return (
    <div className="min-h-screen bg-ink">
      <VolunteerHeader name={me.name} email={me.email} />
      {children}
    </div>
  );
}
