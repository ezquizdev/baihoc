import { NextResponse } from "next/server";
import { controllerAdminListUsers } from "@/application/controllers/userAdminController";
import { requireAuthenticatedApi } from "@/application/infra/auth/guards";

const roleValues = ["student", "staff"] as const;
const tierValues = ["free", "paid"] as const;
const statusValues = [
  "pending_verification",
  "active",
  "suspended",
  "deactivated",
] as const;

function parseEnumParam<T extends readonly string[]>(
  value: string | null,
  allowed: T,
): T[number] | undefined {
  if (!value) return undefined;
  return allowed.includes(value) ? (value as T[number]) : undefined;
}

export async function GET(request: Request) {
  const session = await requireAuthenticatedApi(request, { role: "staff" });
  if (session instanceof NextResponse) return session;

  const url = new URL(request.url);
  const search = url.searchParams.get("search") ?? undefined;
  const role = parseEnumParam(url.searchParams.get("role"), roleValues);
  const tier = parseEnumParam(url.searchParams.get("tier"), tierValues);
  const status = parseEnumParam(url.searchParams.get("status"), statusValues);
  const limitParam = url.searchParams.get("limit");
  const offsetParam = url.searchParams.get("offset");
  const limit = limitParam
    ? Math.min(Math.max(parseInt(limitParam, 10), 1), 100)
    : 20;
  const offset = offsetParam ? Math.max(parseInt(offsetParam, 10), 0) : 0;

  try {
    const result = await controllerAdminListUsers({
      search: search ?? undefined,
      role,
      tier,
      status,
      limit,
      offset,
    });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Lỗi không xác định";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
