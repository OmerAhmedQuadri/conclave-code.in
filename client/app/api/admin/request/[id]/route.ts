import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { isAdmin } from "@/lib/admin-auth";
import { invitees } from "@/lib/db";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  let oid: ObjectId;
  try {
    oid = new ObjectId(id);
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid id" }, { status: 422 });
  }

  const col = await invitees();
  const res = await col.deleteOne({ _id: oid, status: "requested" });
  if (res.deletedCount === 0) {
    return NextResponse.json(
      { ok: false, message: "Request not found or already actioned" },
      { status: 404 },
    );
  }
  return NextResponse.json({ ok: true });
}
