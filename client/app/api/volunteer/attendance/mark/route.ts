import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { getCurrentVolunteer } from "@/lib/volunteer-auth";
import { invitees } from "@/lib/db";

const bodySchema = z.object({
  token: z.string().min(8).max(128),
});

export async function POST(request: Request) {
  const me = await getCurrentVolunteer();
  if (!me) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "Invalid QR" }, { status: 422 });
  }

  // The QR may contain just the token, or a full URL ending in the token.
  // Pull off anything after the last `/` so admins are free to encode either form.
  const raw = parsed.data.token.trim();
  const token = raw.includes("/") ? raw.split("/").filter(Boolean).pop() ?? raw : raw;

  const col = await invitees();
  const doc = await col.findOne({ token });
  if (!doc) {
    return NextResponse.json(
      { ok: false, message: "QR not recognised. Ask the guest to show the email confirmation." },
      { status: 404 }
    );
  }
  if (doc.status !== "approved") {
    return NextResponse.json(
      {
        ok: false,
        message: `Not on the approved list yet (status: ${doc.status}).`,
        invitee: { email: doc.email, name: doc.name },
      },
      { status: 409 }
    );
  }
  if (doc.attendedAt) {
    return NextResponse.json(
      {
        ok: false,
        alreadyAttended: true,
        message: `Already checked in by ${doc.attendedByName ?? "a volunteer"}.`,
        invitee: {
          email: doc.email,
          name: doc.name,
          attendedAt: doc.attendedAt.toISOString(),
          attendedByName: doc.attendedByName ?? null,
        },
      },
      { status: 409 }
    );
  }

  let volunteerOid: ObjectId | undefined;
  try {
    volunteerOid = new ObjectId(me.id);
  } catch {
    // shouldn't happen, but proceed without if it does
  }

  const now = new Date();
  await col.updateOne(
    { _id: doc._id },
    {
      $set: {
        attendedAt: now,
        attendedBy: volunteerOid,
        attendedByName: me.name,
      },
    }
  );

  return NextResponse.json({
    ok: true,
    invitee: {
      id: doc._id?.toString(),
      email: doc.email,
      name: doc.name,
      role: doc.requestData?.role,
      studentName: doc.requestData?.studentName,
      attendedAt: now.toISOString(),
    },
  });
}
