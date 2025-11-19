import { NextResponse } from "next/server";
import {
  controllerAdminAllowlistAdd,
  controllerAdminAllowlistList,
  controllerAdminAllowlistRemove,
} from "@/application/controllers/userAdminController";
import { requireAuthenticatedApi } from "@/application/infra/auth/guards";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}

export async function GET(request: Request) {
  const session = await requireAuthenticatedApi(request, { role: "staff" });
  if (session instanceof NextResponse) return session;

  const url = new URL(request.url);
  const limitParam = url.searchParams.get("limit");
  const offsetParam = url.searchParams.get("offset");
  const limit = limitParam
    ? Math.min(Math.max(parseInt(limitParam, 10), 1), 500)
    : 200;
  const offset = offsetParam ? Math.max(parseInt(offsetParam, 10), 0) : 0;

  try {
    const list = await controllerAdminAllowlistList({ limit, offset });
    return NextResponse.json({ items: list }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Lỗi không xác định";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  const session = await requireAuthenticatedApi(request, { role: "staff" });
  if (session instanceof NextResponse) return session;

  try {
    const body = await request.json();
    const email =
      typeof body.email === "string" ? normalizeEmail(body.email) : null;
    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { error: "Email không hợp lệ" },
        { status: 400 },
      );
    }
    await controllerAdminAllowlistAdd(email, session.sub);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Lỗi không xác định";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const session = await requireAuthenticatedApi(request, { role: "staff" });
  if (session instanceof NextResponse) return session;

  try {
    const body = await request.json();
    const email =
      typeof body.email === "string" ? normalizeEmail(body.email) : null;
    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { error: "Email không hợp lệ" },
        { status: 400 },
      );
    }
    await controllerAdminAllowlistRemove(email, session.sub);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Lỗi không xác định";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
