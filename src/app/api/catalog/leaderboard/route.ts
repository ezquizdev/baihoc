import { NextResponse } from "next/server";
import { parseNumber } from "@/app/api/_utils/query";
import { controllerListTopLeaderboard } from "@/application/controllers/leaderboardController";
import { requireAuthenticatedApi } from "@/application/infra/auth/guards";

export async function GET(request: Request) {
  const auth = await requireAuthenticatedApi(request, {
    allowIncompleteProfile: false,
  });
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const rawLimit = parseNumber(searchParams, "limit");
  const limit = clamp(rawLimit ?? 7, 1, 50);

  try {
    const items = await controllerListTopLeaderboard(limit);
    return NextResponse.json({ items });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Không thể tải leaderboard";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
