import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { invitees } from "@/lib/db";

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const col = await invitees();
  const docs = await col
    .find({}, { projection: { otp: 0, otpExpiresAt: 0, otpAttempts: 0 } })
    .sort({ invitedAt: -1 })
    .toArray();

  return NextResponse.json({
    ok: true,
    invitees: docs.map((d) => ({
      id: d._id?.toString(),
      email: d.email,
      name: d.name,
      status: d.status,
      token: d.token,
      reason: d.reason,
      requestedAt: d.requestedAt,
      invitedAt: d.invitedAt,
      registeredAt: d.registeredAt,
      verifiedAt: d.verifiedAt,
      decidedAt: d.decidedAt,
      formData: d.formData,
    })),
  });
}
