import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  controllerAdminAllowlistAdd,
  controllerAdminAllowlistBulk,
  controllerAdminAllowlistList,
  controllerAdminAllowlistRemove,
} from "@/application/controllers/userAdminController";
import { requireAuthenticatedApi } from "@/application/infra/auth/guards";
import { parsePagination } from "@/app/api/_utils/query";

const roleValues = ["student", "staff"] as const;
const tierValues = ["free", "paid"] as const;

const allowlistEntrySchema = z.object({
  email: z.string().email(),
  role: z.enum(roleValues).optional(),
  tier: z.enum(tierValues).optional(),
});

const allowlistBodySchema = z.union([
  allowlistEntrySchema,
  z.object({ entries: z.array(allowlistEntrySchema).min(1) }),
]);

export async function GET(request: NextRequest) {
  const session = await requireAuthenticatedApi(request, { role: "staff" });
  if (session instanceof NextResponse) return session;

  const url = new URL(request.url);
  const { limit, offset } = parsePagination(
    url.searchParams,
    { limit: 200, offset: 0 },
    500,
  );

  try {
    const list = await controllerAdminAllowlistList({ limit, offset });
    return NextResponse.json({ items: list }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Lỗi không xác định";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  const session = await requireAuthenticatedApi(request, { role: "staff" });
  if (session instanceof NextResponse) return session;

  try {
    const body = await request.json();
    const parsed = allowlistBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Danh sách email không hợp lệ" },
        { status: 400 },
      );
    }

    if ("entries" in parsed.data) {
      const result = await controllerAdminAllowlistBulk(
        parsed.data.entries,
        session.sub,
      );
      return NextResponse.json(result, { status: 200 });
    }

    await controllerAdminAllowlistAdd({
      email: parsed.data.email,
      role: parsed.data.role,
      tier: parsed.data.tier,
      actorUserId: session.sub,
    });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Lỗi không xác định";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await requireAuthenticatedApi(request, { role: "staff" });
  if (session instanceof NextResponse) return session;

  try {
    const body = await request.json();
    const parsed = z
      .object({ email: z.string().email() })
      .safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Email không hợp lệ" }, { status: 400 });
    }
    await controllerAdminAllowlistRemove({
      email: parsed.data.email,
      actorUserId: session.sub,
    });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Lỗi không xác định";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
