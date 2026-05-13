import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentVolunteer } from "@/lib/volunteer-auth";
import { invitees } from "@/lib/db";

const querySchema = z.object({
  token: z.string().min(8).max(256),
});

export async function GET(request: Request) {
  const me = await getCurrentVolunteer();
  if (!me) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({ token: searchParams.get("token") ?? "" });
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "Invalid QR" }, { status: 422 });
  }

  // QR payload may be a bare token or a URL ending in `/<token>`.
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

  return NextResponse.json({
    ok: true,
    invitee: {
      token: doc.token,
      email: doc.email,
      name: doc.name,
      status: doc.status,
      role: doc.requestData?.role,
      studentName: doc.requestData?.studentName,
      school: doc.requestData?.school,
      city: doc.requestData?.city,
      attendedAt: doc.attendedAt ? doc.attendedAt.toISOString() : null,
      attendedByName: doc.attendedByName ?? null,
    },
  });
}
