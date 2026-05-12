import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { assignInviteesSchema } from "@/models/volunteer";
import { getAdminEmail } from "@/lib/admin-auth";
import { invitees, volunteers } from "@/lib/db";

export async function POST(request: Request) {
  const adminEmail = await getAdminEmail();
  if (!adminEmail) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request" }, { status: 400 });
  }

  const parsed = assignInviteesSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid input";
    return NextResponse.json({ ok: false, message }, { status: 422 });
  }

  const volunteerIdRaw = parsed.data.volunteerId;
  // Special value "__unassign__" clears existing assignment instead of setting one.
  const isUnassign = volunteerIdRaw === "__unassign__";

  let volunteerOid: ObjectId | null = null;
  if (!isUnassign) {
    try {
      volunteerOid = new ObjectId(volunteerIdRaw);
    } catch {
      return NextResponse.json({ ok: false, message: "Invalid volunteer id" }, { status: 400 });
    }
    const volunteer = await (await volunteers()).findOne({ _id: volunteerOid });
    if (!volunteer) {
      return NextResponse.json({ ok: false, message: "Volunteer not found" }, { status: 404 });
    }
  }

  const inviteeOids: ObjectId[] = [];
  for (const id of parsed.data.inviteeIds) {
    try {
      inviteeOids.push(new ObjectId(id));
    } catch {
      // skip malformed ids
    }
  }
  if (inviteeOids.length === 0) {
    return NextResponse.json({ ok: false, message: "No valid invitee ids" }, { status: 422 });
  }

  const col = await invitees();
  const filter = {
    _id: { $in: inviteeOids },
    // Only assign people who've been approved
    status: "approved" as const,
  };

  const res = isUnassign
    ? await col.updateMany(filter, {
        $unset: { assignedVolunteerId: "" as const, assignedAt: "" as const, assignedBy: "" as const },
      })
    : await col.updateMany(filter, {
        $set: {
          assignedVolunteerId: volunteerOid!,
          assignedAt: new Date(),
          assignedBy: adminEmail,
        },
      });
  return NextResponse.json({
    ok: true,
    matched: res.matchedCount,
    modified: res.modifiedCount,
  });
}
