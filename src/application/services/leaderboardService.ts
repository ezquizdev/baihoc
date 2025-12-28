import {
  findActiveStudentIdByEmail,
  findActiveStudentIdsByFullName,
  getLeaderboard,
  getLeaderboardTable,
  getLeaderboardTableEntryByUserId,
} from "@/application/infra/db/leaderboardRepo";
import type {
  LeaderboardSortBy,
  LeaderboardSortDir,
  LeaderboardTableEntry,
  LeaderboardTableResult,
} from "@/application/models/leaderboard";
import { ServiceError } from "@/application/services/errors";
import { isValidEmailFormat, normalizeEmail } from "@/application/utils/email";

export async function getLeaderboardForViewer(params: {
  viewerUserId: string;
  limit: number;
  includeSelf: boolean;
  subjectId?: string | null;
}) {
  return getLeaderboard(params);
}

export async function getLeaderboardTableForViewer(params: {
  viewerUserId: string;
  limit: number;
  offset: number;
  sortBy: LeaderboardSortBy;
  sortDir: LeaderboardSortDir;
  includeSelf: boolean;
}): Promise<LeaderboardTableResult> {
  return getLeaderboardTable(params);
}

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getLeaderboardTableEntryForSearch(params: {
  query: string;
  sortBy: LeaderboardSortBy;
  sortDir: LeaderboardSortDir;
}): Promise<LeaderboardTableEntry | null> {
  const raw = params.query.trim();
  if (!raw) {
    throw new ServiceError(
      "INVALID_QUERY",
      "Từ khoá tìm kiếm không hợp lệ",
      400,
    );
  }

  if (uuidRegex.test(raw)) {
    return getLeaderboardTableEntryByUserId({
      userId: raw,
      sortBy: params.sortBy,
      sortDir: params.sortDir,
    });
  }

  if (raw.includes("@")) {
    const email = normalizeEmail(raw);
    if (!isValidEmailFormat(email)) {
      throw new ServiceError("INVALID_EMAIL", "Email không hợp lệ", 400);
    }

    const userId = await findActiveStudentIdByEmail(email);
    if (!userId) return null;
    return getLeaderboardTableEntryByUserId({
      userId,
      sortBy: params.sortBy,
      sortDir: params.sortDir,
    });
  }

  const ids = await findActiveStudentIdsByFullName({ query: raw, limit: 2 });
  if (ids.length === 0) return null;
  if (ids.length > 1) {
    throw new ServiceError(
      "AMBIGUOUS_FULL_NAME",
      "Có nhiều học sinh trùng tên. Hãy nhập email hoặc ID.",
      409,
    );
  }

  return getLeaderboardTableEntryByUserId({
    userId: ids[0],
    sortBy: params.sortBy,
    sortDir: params.sortDir,
  });
}
