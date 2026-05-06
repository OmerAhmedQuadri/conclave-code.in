import { NextResponse } from "next/server";
import type { InviteePublicResponse } from "@/models/invitee";
import { invitees } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const doc = await (await invitees()).findOne({ token });
  if (!doc) {
    return NextResponse.json({ ok: false, message: "Invitation not found" }, { status: 404 });
  }

  const res: InviteePublicResponse = {
    ok: true,
    invitee: { email: doc.email, name: doc.name, status: doc.status },
  };
  return NextResponse.json(res);
}
