import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import type { InviteeListItem } from "@/models/invitee";
import { getCurrentVolunteer } from "@/lib/volunteer-auth";
import { invitees } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const me = await getCurrentVolunteer();
  if (!me) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  let oid: ObjectId;
  try {
    oid = new ObjectId(me.id);
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid volunteer id" }, { status: 400 });
  }

  const col = await invitees();
  const docs = await col
    .find(
      { assignedVolunteerId: oid },
      { projection: { otp: 0, otpExpiresAt: 0, otpAttempts: 0 } }
    )
    .sort({ assignedAt: -1 })
    .toArray();

  const list: InviteeListItem[] = docs.map((d) => ({
    id: d._id?.toString(),
    email: d.email,
    originalEmail: d.originalEmail,
    name: d.name,
    status: d.status,
    source: d.source,
    token: d.token,
    reason: d.reason,
    requestedAt: d.requestedAt,
    invitedAt: d.invitedAt,
    registeredAt: d.registeredAt,
    verifiedAt: d.verifiedAt,
    decidedAt: d.decidedAt,
    formData: d.formData,
    requestData: d.requestData,
  }));

  return NextResponse.json({ ok: true, invitees: list });
}
