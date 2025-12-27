import { NextResponse } from "next/server";
import { parseNumber } from "@/app/api/_utils/query";
import { controllerGetLeaderboard } from "@/application/controllers/leaderboardController";
import { requireAuthenticatedApi } from "@/application/infra/auth/guards";

export async function GET(request: Request) {
  const auth = await requireAuthenticatedApi(request, {
    allowIncompleteProfile: false,
  });
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const rawLimit = parseNumber(searchParams, "limit");
  const limit = clamp(rawLimit ?? 7, 1, 50);
  const includeSelf = parseBoolean(searchParams, "includeSelf") ?? false;
  const subjectId = parseUuid(searchParams.get("subjectId"));
  if (searchParams.has("subjectId") && subjectId === undefined) {
    return NextResponse.json(
      { error: "subjectId không hợp lệ" },
      { status: 400 },
    );
  }

  try {
    const result = await controllerGetLeaderboard({
      viewerUserId: auth.sub,
      limit,
      includeSelf,
      subjectId: subjectId ?? null,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Không thể tải leaderboard";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function parseBoolean(searchParams: URLSearchParams, key: string) {
  const value = searchParams.get(key);
  if (value === null) return undefined;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "y", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "n", "off"].includes(normalized)) return false;
  return undefined;
}

function parseUuid(value: string | null) {
  if (!value) return undefined;
  const trimmed = value.trim();
  const uuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuid.test(trimmed) ? trimmed : undefined;
}
