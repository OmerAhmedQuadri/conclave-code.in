import { NextResponse } from "next/server";
import { invitees } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const col = await invitees();
  const doc = await col.findOne({ token });
  if (!doc) {
    return NextResponse.json({ ok: false, message: "Invitation not found" }, { status: 404 });
  }
  return NextResponse.json({
    ok: true,
    invitee: {
      email: doc.email,
      name: doc.name,
      status: doc.status,
    },
  });
}
