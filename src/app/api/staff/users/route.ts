import { type NextRequest, NextResponse } from "next/server";
import { parsePagination } from "@/app/api/_utils/query";
import { controllerAdminListUsers } from "@/application/controllers/userAdminController";
import { requireAuthenticatedApi } from "@/application/infra/auth/guards";

const roleValues = ["student", "staff"] as const;
const tierValues = ["free", "paid"] as const;
const statusValues = ["pending_verification", "active", "deactivated"] as const;

function parseEnumParam<T extends readonly string[]>(
  value: string | null,
  allowed: T,
): T[number] | undefined {
  if (!value) return undefined;
  return allowed.includes(value) ? (value as T[number]) : undefined;
}

export async function GET(request: NextRequest) {
  const session = await requireAuthenticatedApi(request, { role: "staff" });
  if (session instanceof NextResponse) return session;

  const url = new URL(request.url);
  const search = url.searchParams.get("search") ?? undefined;
  const role = parseEnumParam(url.searchParams.get("role"), roleValues);
  const tier = parseEnumParam(url.searchParams.get("tier"), tierValues);
  const status = parseEnumParam(url.searchParams.get("status"), statusValues);
  const { limit, offset } = parsePagination(
    url.searchParams,
    { limit: 20, offset: 0 },
    100,
  );

  try {
    const result = await controllerAdminListUsers({
      search,
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
