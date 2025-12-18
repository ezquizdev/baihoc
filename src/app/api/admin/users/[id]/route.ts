import { NextResponse } from "next/server";
import {
  controllerAdminGetUser,
  controllerAdminUpdateUser,
} from "@/application/controllers/userAdminController";
import { requireAuthenticatedApi } from "@/application/infra/auth/guards";

const roleValues = ["student", "staff"] as const;
const tierValues = ["free", "paid"] as const;
const statusValues = [
  "pending_verification",
  "active",
  "suspended",
  "deactivated",
] as const;

function parseEnum<T extends readonly string[]>(
  value: unknown,
  allowed: T,
): T[number] | undefined {
  if (typeof value !== "string") return undefined;
  return allowed.includes(value) ? (value as T[number]) : undefined;
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const session = await requireAuthenticatedApi(request, { role: "staff" });
  if (session instanceof NextResponse) return session;

  if (!params?.id) {
    return NextResponse.json({ error: "Thiếu mã người dùng" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const role = parseEnum(body.role, roleValues);
    const tier = parseEnum(body.tier, tierValues);
    const status = parseEnum(body.status, statusValues);
    const reason =
      typeof body.reason === "string" && body.reason.trim()
        ? body.reason.trim()
        : null;

    if (!role && !tier && !status) {
      return NextResponse.json(
        { error: "Không có thay đổi hợp lệ" },
        { status: 400 },
      );
    }

    const user = await controllerAdminUpdateUser({
      userId: params.id,
      role: role ?? undefined,
      tier: tier ?? undefined,
      status: status ?? undefined,
      reason,
      actorUserId: session.sub,
    });
    return NextResponse.json({ user }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Lỗi không xác định";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } },
) {
  const session = await requireAuthenticatedApi(request, { role: "staff" });
  if (session instanceof NextResponse) return session;
  if (!params?.id) {
    return NextResponse.json({ error: "Thiếu mã người dùng" }, { status: 400 });
  }
  try {
    const user = await controllerAdminGetUser(params.id);
    return NextResponse.json({ user }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Lỗi không xác định";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
