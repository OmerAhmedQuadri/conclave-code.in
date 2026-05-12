import { NextResponse } from "next/server";
import { getCurrentVolunteer } from "@/lib/volunteer-auth";

export async function GET() {
  const me = await getCurrentVolunteer();
  if (!me) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ ok: true, volunteer: me });
}
