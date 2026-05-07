import { NextResponse } from "next/server";
import type { SchoolListItem } from "@/models/school";
import { schools } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const col = await schools();
  const docs = await col.find({}).sort({ name: 1 }).toArray();
  const list: SchoolListItem[] = docs.map((d) => ({
    id: d._id?.toString() ?? "",
    name: d.name,
    createdAt: d.createdAt,
    createdBy: d.createdBy,
  }));
  return NextResponse.json({ ok: true, schools: list });
}
