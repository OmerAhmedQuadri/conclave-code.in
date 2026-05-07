import { NextResponse } from "next/server";
import type { Poc, SchoolListItem } from "@/models/school";
import { addSchoolSchema } from "@/models/school";
import { getAdminEmail } from "@/lib/admin-auth";
import { schools } from "@/lib/db";

function normalizePocs(input?: { name: string; email?: string; phone?: string }[]): Poc[] | undefined {
  if (!input?.length) return undefined;
  const cleaned = input
    .map((p) => ({
      name: p.name.trim(),
      email: p.email?.trim() || undefined,
      phone: p.phone?.trim() || undefined,
    }))
    .filter((p) => p.name.length > 0);
  return cleaned.length ? cleaned : undefined;
}

export async function GET() {
  const adminEmail = await getAdminEmail();
  if (!adminEmail) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const col = await schools();
  const docs = await col.find({}).sort({ createdAt: -1 }).toArray();
  const list: SchoolListItem[] = docs.map((d) => ({
    id: d._id?.toString() ?? "",
    name: d.name,
    pocs: d.pocs,
    createdAt: d.createdAt,
    createdBy: d.createdBy,
  }));
  return NextResponse.json({ ok: true, schools: list });
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

  const parsed = addSchoolSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid input";
    return NextResponse.json({ ok: false, message }, { status: 422 });
  }

  const name = parsed.data.name.trim();
  const pocs = normalizePocs(parsed.data.pocs);

  const col = await schools();
  if (await col.findOne({ name })) {
    return NextResponse.json({ ok: false, message: "School already exists" }, { status: 409 });
  }

  await col.insertOne({
    name,
    pocs,
    createdAt: new Date(),
    createdBy: adminEmail,
  });
  return NextResponse.json({ ok: true });
}
