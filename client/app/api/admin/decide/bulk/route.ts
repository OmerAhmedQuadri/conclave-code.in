import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminEmail } from "@/lib/admin-auth";
import { invitees } from "@/lib/db";
import { sendConfirmationEmail } from "@/lib/mailer";

const bulkDecideSchema = z.object({
  tokens: z.array(z.string().min(10)).min(1).max(200),
  decision: z.enum(["approve", "reject"]),
});

interface RowResult {
  token: string;
  email?: string;
  ok: boolean;
  message?: string;
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

  const parsed = bulkDecideSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid input";
    return NextResponse.json({ ok: false, message }, { status: 422 });
  }

  const { tokens, decision } = parsed.data;
  const newStatus = decision === "approve" ? "approved" : "rejected";
  const col = await invitees();
  const now = new Date();
  const results: RowResult[] = [];

  // De-dupe tokens
  const unique = Array.from(new Set(tokens));

  for (const token of unique) {
    const doc = await col.findOne({ token });
    if (!doc) {
      results.push({ token, ok: false, message: "Not found" });
      continue;
    }

    // Same gate as the single decide endpoint:
    // - portal "requested" rows: decidable (email already verified upfront)
    // - admin-invite "otp_verified" rows: decidable (registered + verified)
    // - portal "otp_verified" is incomplete (no requestData) — reject
    const isDecidable =
      doc.status === "requested" ||
      (doc.status === "otp_verified" && doc.source !== "portal");
    if (!isDecidable) {
      results.push({
        token,
        email: doc.email,
        ok: false,
        message: `Cannot decide on status "${doc.status}"`,
      });
      continue;
    }

    await col.updateOne(
      { _id: doc._id },
      { $set: { status: newStatus, decidedAt: now, decidedBy: adminEmail } }
    );

    if (decision === "approve") {
      // Fire-and-forget — don't block the response on email delivery
      sendConfirmationEmail({ to: doc.email, name: doc.name }).catch((err) =>
        console.error("[decide/bulk] confirmation email failed:", doc.email, err)
      );
    }

    results.push({ token, email: doc.email, ok: true });
  }

  const succeeded = results.filter((r) => r.ok).length;
  const failed = results.length - succeeded;
  return NextResponse.json({ ok: true, succeeded, failed, results });
}
