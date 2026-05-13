import { redirect } from "next/navigation";
import { getVolunteerEmail } from "@/lib/volunteer-auth";

export const dynamic = "force-dynamic";

export default async function VolunteerIndexPage() {
  const email = await getVolunteerEmail();
  redirect(email ? "/volunteer/dashboard" : "/volunteer/login");
}
