import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import type { Poc } from "@/models/school";
import { updateSchoolSchema } from "@/models/school";
import { getAdminEmail } from "@/lib/admin-auth";
import { schools } from "@/lib/db";

function normalizePocs(input?: { name: string; email?: string; phone?: string }[]): Poc[] {
  if (!input?.length) return [];
  return input
    .map((p) => ({
      name: p.name.trim(),
      email: p.email?.trim() || undefined,
      phone: p.phone?.trim() || undefined,
    }))
    .filter((p) => p.name.length > 0);
}

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

  const parsed = updateSchoolSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid input";
    return NextResponse.json({ ok: false, message }, { status: 422 });
  }

  const update: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) update.name = parsed.data.name.trim();
  if (parsed.data.pocs !== undefined) update.pocs = normalizePocs(parsed.data.pocs);

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ ok: false, message: "Nothing to update" }, { status: 400 });
  }

  const col = await schools();
  const res = await col.updateOne({ _id: oid }, { $set: update });
  if (res.matchedCount === 0) {
    return NextResponse.json({ ok: false, message: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
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

  const col = await schools();
  const res = await col.deleteOne({ _id: oid });
  if (res.deletedCount === 0) {
    return NextResponse.json({ ok: false, message: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
