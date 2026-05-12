import { NextResponse } from "next/server";
import { volunteerLoginSchema } from "@/models/volunteer";
import { setVolunteerSession, verifyVolunteerCredentials } from "@/lib/volunteer-auth";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request" }, { status: 400 });
  }

  const parsed = volunteerLoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "Email and password required" },
      { status: 422 }
    );
  }

  const result = await verifyVolunteerCredentials(parsed.data.email, parsed.data.password);
  if (!result) {
    return NextResponse.json({ ok: false, message: "Invalid credentials" }, { status: 401 });
  }

  await setVolunteerSession(result.email);
  return NextResponse.json({ ok: true, email: result.email, name: result.name });
}
