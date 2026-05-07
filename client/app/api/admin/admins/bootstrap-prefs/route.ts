import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminEmail } from "@/lib/admin-auth";
import { admins } from "@/lib/db";

const bodySchema = z.object({
  receiveEmails: z.boolean(),
});

export async function PATCH(request: Request) {
  const adminEmail = await getAdminEmail();
  if (!adminEmail) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const bootstrapEmail = process.env.ADMIN_EMAIL?.toLowerCase();
  if (!bootstrapEmail) {
    return NextResponse.json(
      { ok: false, message: "ADMIN_EMAIL env var is not set" },
      { status: 500 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid input";
    return NextResponse.json({ ok: false, message }, { status: 422 });
  }

  // Upsert a settings doc keyed by isBootstrap. The doc is identified by
  // email == bootstrapEmail AND isBootstrap == true. passwordHash is empty
  // because the bootstrap admin authenticates via env vars, never via this row.
  const col = await admins();
  await col.updateOne(
    { isBootstrap: true },
    {
      $set: {
        email: bootstrapEmail,
        role: "admin",
        receiveEmails: parsed.data.receiveEmails,
      },
      $setOnInsert: {
        isBootstrap: true,
        passwordHash: "",
        createdAt: new Date(),
        createdBy: "env",
      },
    },
    { upsert: true }
  );

  return NextResponse.json({ ok: true });
}
