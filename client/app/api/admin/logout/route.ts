import { NextResponse } from "next/server";
import type { LogoutResponse } from "@/models/logout";
import { clearAdminSession } from "@/lib/admin-auth";

export async function POST() {
  await clearAdminSession();
  const res: LogoutResponse = { ok: true };
  return NextResponse.json(res);
}
