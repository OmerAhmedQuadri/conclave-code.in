import { NextResponse } from "next/server";
import { addAdminSchema } from "@/models/admin";
import { getAdminEmail, hashPassword } from "@/lib/admin-auth";
import { admins } from "@/lib/db";

export async function GET() {
  const adminEmail = await getAdminEmail();
  if (!adminEmail) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const col = await admins();
  const docs = await col
    .find({}, { projection: { passwordHash: 0 } })
    .sort({ createdAt: -1 })
    .toArray();

  return NextResponse.json({
    ok: true,
    bootstrapEmail: process.env.ADMIN_EMAIL?.toLowerCase() ?? null,
    admins: docs.map((d) => ({
      id: d._id?.toString(),
      email: d.email,
      createdAt: d.createdAt,
      createdBy: d.createdBy,
    })),
  });
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

  const parsed = addAdminSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid input";
    return NextResponse.json({ ok: false, message }, { status: 422 });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const col = await admins();
  if (await col.findOne({ email })) {
    return NextResponse.json({ ok: false, message: "Admin already exists" }, { status: 409 });
  }

  await col.insertOne({
    email,
    passwordHash: hashPassword(parsed.data.password),
    role: "admin",
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
  if (target === process.env.ADMIN_EMAIL?.toLowerCase()) {
    return NextResponse.json(
      { ok: false, message: "Cannot remove bootstrap admin" },
      { status: 400 }
    );
  }
  if (target === adminEmail) {
    return NextResponse.json({ ok: false, message: "Cannot remove yourself" }, { status: 400 });
  }

  const res = await (await admins()).deleteOne({ email: target });
  if (res.deletedCount === 0) {
    return NextResponse.json({ ok: false, message: "Admin not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
