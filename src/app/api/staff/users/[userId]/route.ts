import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  controllerAdminGetUser,
  controllerAdminUpdateUser,
} from "@/application/controllers/userAdminController";
import { requireAuthenticatedApi } from "@/application/infra/auth/guards";

const roleValues = ["student", "staff"] as const;
const tierValues = ["free", "paid"] as const;
const statusValues = ["pending_verification", "active", "deactivated"] as const;

const updateSchema = z
  .object({
    role: z.enum(roleValues).optional(),
    tier: z.enum(tierValues).optional(),
    status: z.enum(statusValues).optional(),
    reason: z.string().trim().min(1).nullable().optional(),
  })
  .refine((data) => data.role || data.tier || data.status, {
    message: "Không có thay đổi hợp lệ",
  });

type Params = { userId: string };

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<Params> },
) {
  const session = await requireAuthenticatedApi(request, { role: "staff" });
  if (session instanceof NextResponse) return session;

  try {
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Không có thay đổi hợp lệ" },
        { status: 400 },
      );
    }
    const { userId } = await context.params;
    const user = await controllerAdminUpdateUser({
      userId,
      role: parsed.data.role,
      tier: parsed.data.tier,
      status: parsed.data.status,
      reason: parsed.data.reason ?? null,
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
  request: NextRequest,
  context: { params: Promise<Params> },
) {
  const session = await requireAuthenticatedApi(request, { role: "staff" });
  if (session instanceof NextResponse) return session;
  try {
    const { userId } = await context.params;
    const user = await controllerAdminGetUser(userId);
    return NextResponse.json({ user }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Lỗi không xác định";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
