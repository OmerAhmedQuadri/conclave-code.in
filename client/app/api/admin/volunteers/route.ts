import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import type { VolunteerListItem } from "@/models/volunteer";
import { addVolunteerSchema } from "@/models/volunteer";
import { getAdminEmail, hashPassword } from "@/lib/admin-auth";
import { invitees, volunteers } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const adminEmail = await getAdminEmail();
  if (!adminEmail) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const col = await volunteers();
  const docs = await col
    .find({}, { projection: { passwordHash: 0 } })
    .sort({ createdAt: -1 })
    .toArray();

  // Aggregate assignment counts in one pass
  const inviteeCol = await invitees();
  const counts = await inviteeCol
    .aggregate<{ _id: ObjectId; n: number }>([
      { $match: { assignedVolunteerId: { $exists: true } } },
      { $group: { _id: "$assignedVolunteerId", n: { $sum: 1 } } },
    ])
    .toArray();
  const countMap = new Map(counts.map((c) => [c._id.toString(), c.n]));

  const list: VolunteerListItem[] = docs.map((d) => ({
    id: d._id?.toString() ?? "",
    email: d.email,
    name: d.name,
    createdAt: d.createdAt,
    createdBy: d.createdBy,
    assignedCount: countMap.get(d._id?.toString() ?? "") ?? 0,
  }));

  return NextResponse.json({ ok: true, volunteers: list });
}

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

  const parsed = addVolunteerSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid input";
    return NextResponse.json({ ok: false, message }, { status: 422 });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const name = parsed.data.name.trim();
  const col = await volunteers();
  if (await col.findOne({ email })) {
    return NextResponse.json({ ok: false, message: "Volunteer already exists" }, { status: 409 });
  }

  await col.insertOne({
    email,
    name,
    passwordHash: hashPassword(parsed.data.password),
    createdAt: new Date(),
    createdBy: adminEmail,
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const adminEmail = await getAdminEmail();
  if (!adminEmail) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const target = new URL(request.url).searchParams.get("email")?.trim().toLowerCase();
  if (!target) {
    return NextResponse.json({ ok: false, message: "email required" }, { status: 422 });
  }

  const col = await volunteers();
  const doc = await col.findOne({ email: target });
  if (!doc) {
    return NextResponse.json({ ok: false, message: "Volunteer not found" }, { status: 404 });
  }

  // Unassign any invitees assigned to this volunteer first
  await (await invitees()).updateMany(
    { assignedVolunteerId: doc._id },
    { $unset: { assignedVolunteerId: "", assignedAt: "", assignedBy: "" } }
  );
  await col.deleteOne({ _id: doc._id });
  return NextResponse.json({ ok: true });
}
