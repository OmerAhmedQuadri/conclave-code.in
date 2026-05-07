import { NextResponse } from "next/server";
import { requestInviteSchema } from "@/models/request-invite";
import { invitees, admins } from "@/lib/db";
import { generateInviteToken } from "@/lib/tokens";
import { sendNewRequestNotification } from "@/lib/mailer";

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
      return NextResponse.json({
        ok: true,
        message: "We already have your request — we'll be in touch.",
      });
    }
    return NextResponse.json(
      {
        ok: false,
        message:
          "This email is already in our system. Please check your inbox or contact us on WhatsApp.",
      },
      { status: 409 }
    );
  }

  await col.insertOne({
    email,
    name,
    token: generateInviteToken(),
    status: "requested",
    source: "portal",
    reason: reason ? (city ? `[${city}] ${reason}` : reason) : city ? `[${city}]` : undefined,
    requestedAt: new Date(),
  });

  // Notify admins — fire-and-forget so a mail failure never blocks the user
  (async () => {
    try {
      const adminCol = await admins();
      const adminDocs = await adminCol.find({ role: "admin" }, { projection: { email: 1 } }).toArray();
      const recipients = adminDocs.map((d) => d.email);
      await sendNewRequestNotification({ to: recipients, name, email, city, reason });
    } catch (err) {
      console.error("[request-invite] admin notification failed:", err);
    }
  })();

  return NextResponse.json({ ok: true });
}
