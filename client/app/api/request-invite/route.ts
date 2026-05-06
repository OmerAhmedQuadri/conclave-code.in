import { NextResponse } from "next/server";
import { requestInviteSchema } from "@/lib/validations";
import { invitees } from "@/lib/db";
import { generateInviteToken } from "@/lib/tokens";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request" }, { status: 400 });
  }

  const parsed = requestInviteSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid form";
    return NextResponse.json({ ok: false, message }, { status: 422 });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const name = parsed.data.name.trim();
  const city = parsed.data.city?.trim() || undefined;
  const reason = parsed.data.reason?.trim() || undefined;

  const col = await invitees();
  const existing = await col.findOne({ email });
  if (existing) {
    if (existing.status === "requested") {
      return NextResponse.json(
        { ok: true, message: "We already have your request — we'll be in touch." },
      );
    }
    return NextResponse.json(
      { ok: false, message: "This email is already in our system. Please check your inbox or contact us on WhatsApp." },
      { status: 409 },
    );
  }

  await col.insertOne({
    email,
    name,
    token: generateInviteToken(),
    status: "requested",
    reason: reason ? (city ? `[${city}] ${reason}` : reason) : city ? `[${city}]` : undefined,
    requestedAt: new Date(),
  });

  return NextResponse.json({ ok: true });
}
