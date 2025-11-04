import { NextResponse } from "next/server";
import { clearSession } from "@/application/infra/auth/session";

export async function POST() {
  await clearSession();
  return NextResponse.json({ ok: true });
}
