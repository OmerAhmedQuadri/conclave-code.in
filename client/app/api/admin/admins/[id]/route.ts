import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { updateAdminSchema } from "@/models/admin";
import { getAdminEmail } from "@/lib/admin-auth";
import { admins } from "@/lib/db";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminEmail = await getAdminEmail();
  if (!adminEmail) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  let oid: ObjectId;
  try {
    oid = new ObjectId(id);
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request" }, { status: 400 });
  }

  const parsed = updateAdminSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid input";
    return NextResponse.json({ ok: false, message }, { status: 422 });
  }

  const update: Record<string, unknown> = {};
  if (parsed.data.receiveEmails !== undefined) {
    update.receiveEmails = parsed.data.receiveEmails;
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ ok: false, message: "Nothing to update" }, { status: 400 });
  }

  const col = await admins();
  const res = await col.updateOne({ _id: oid }, { $set: update });
  if (res.matchedCount === 0) {
    return NextResponse.json({ ok: false, message: "Admin not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
