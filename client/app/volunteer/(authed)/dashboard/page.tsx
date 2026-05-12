import { ObjectId } from "mongodb";
import { getCurrentVolunteer } from "@/lib/volunteer-auth";
import { invitees } from "@/lib/db";
import {
  VolunteerDashboard,
  type AssignedInvitee,
} from "@/components/volunteer-dashboard";

export const dynamic = "force-dynamic";

export default async function VolunteerDashboardPage() {
  const me = await getCurrentVolunteer();
  if (!me) return null; // layout already redirects

  let oid: ObjectId;
  try {
    oid = new ObjectId(me.id);
  } catch {
    return null;
  }

  const col = await invitees();
  const docs = await col
    .find(
      { assignedVolunteerId: oid },
      { projection: { otp: 0, otpExpiresAt: 0, otpAttempts: 0 } }
    )
    .sort({ assignedAt: -1, decidedAt: -1 })
    .toArray();

  const rows: AssignedInvitee[] = docs.map((d) => ({
    id: d._id?.toString() ?? "",
    email: d.email,
    name: d.name,
    status: d.status,
    source: d.source,
    decidedAt: d.decidedAt?.toISOString(),
    invitedAt: d.invitedAt?.toISOString(),
    requestedAt: d.requestedAt?.toISOString(),
    attendedAt: d.attendedAt?.toISOString(),
    attendedByName: d.attendedByName,
    requestData: d.requestData,
  }));

  return <VolunteerDashboard volunteerName={me.name} initialRows={rows} />;
}
