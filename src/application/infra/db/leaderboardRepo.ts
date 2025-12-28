import { query } from "@/application/infra/db/pool";
import type {
  LeaderboardEntry,
  LeaderboardRankedEntry,
  LeaderboardResult,
  LeaderboardSortBy,
  LeaderboardSortDir,
  LeaderboardTableEntry,
  LeaderboardTableResult,
} from "@/application/models/leaderboard";

type LeaderboardRow = {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  xp_total: number;
};

function mapLeaderboardRow(row: LeaderboardRow): LeaderboardEntry {
  return {
    userId: row.user_id,
    fullName: row.full_name,
    avatarUrl: row.avatar_url,
    xp: Number(row.xp_total),
  };
}

type RankedLeaderboardRow = LeaderboardRow & {
  rank: number;
};

function mapRankedLeaderboardRow(
  row: RankedLeaderboardRow,
): LeaderboardRankedEntry {
  return {
    ...mapLeaderboardRow(row),
    rank: Number(row.rank),
  };
}

export async function getLeaderboard(params: {
  limit: number;
  viewerUserId?: string | null;
  includeSelf: boolean;
  subjectId?: string | null;
}): Promise<LeaderboardResult> {
  const viewerUserId = params.includeSelf
    ? (params.viewerUserId ?? null)
    : null;

  // Fast path: use denormalized totals (users.xp_total and user_subject_xp_totals).
  const topRows = params.subjectId
    ? await query<RankedLeaderboardRow>(
        `WITH top AS (
          SELECT ust.user_id,
                 u.full_name,
                 u.avatar_url,
                 LEAST(ust.xp_total, 300)::int AS xp_total
          FROM user_subject_xp_totals ust
          JOIN users u ON u.id = ust.user_id
          WHERE ust.subject_id = $1::uuid
            AND u.role = 'student'
            AND u.status = 'active'
          ORDER BY xp_total DESC, ust.user_id ASC
          LIMIT $2
        ),
        ranked AS (
          SELECT *,
                 RANK() OVER (ORDER BY xp_total DESC) AS rank
          FROM top
        )
        SELECT user_id,
               full_name,
               avatar_url,
               xp_total,
               rank
        FROM ranked
        ORDER BY xp_total DESC, user_id ASC`,
        [params.subjectId, params.limit],
      )
    : await query<RankedLeaderboardRow>(
        `WITH top AS (
          SELECT u.id AS user_id,
                 u.full_name,
                 u.avatar_url,
                 (
                   LEAST(u.xp_vi, 300)
                   + LEAST(u.xp_en, 300)
                   + LEAST(u.xp_math, 300)
                   + LEAST(u.xp_sci, 300)
                 )::int AS xp_total
          FROM users u
          WHERE u.role = 'student'
            AND u.status = 'active'
          ORDER BY xp_total DESC, u.id ASC
          LIMIT $1
        ),
        ranked AS (
          SELECT *,
                 RANK() OVER (ORDER BY xp_total DESC) AS rank
          FROM top
        )
        SELECT user_id,
               full_name,
               avatar_url,
               xp_total,
               rank
        FROM ranked
        ORDER BY xp_total DESC, user_id ASC`,
        [params.limit],
      );

  const items = topRows.rows.map(mapRankedLeaderboardRow);

  if (!params.includeSelf || !viewerUserId) {
    return { items, self: null };
  }

  const isInTop = items.some((entry) => entry.userId === viewerUserId);
  if (isInTop) {
    return { items, self: null };
  }

  if (params.subjectId) {
    const selfBase = await query<LeaderboardRow>(
      `SELECT u.id AS user_id,
              u.full_name,
              u.avatar_url,
              LEAST(COALESCE(ust.xp_total, 0), 300)::int AS xp_total
       FROM users u
       LEFT JOIN user_subject_xp_totals ust
         ON ust.user_id = u.id AND ust.subject_id = $2::uuid
       WHERE u.id = $1
         AND u.role = 'student'
         AND u.status = 'active'`,
      [viewerUserId, params.subjectId],
    );

    const baseRow = selfBase.rows[0];
    if (!baseRow) return { items, self: null };

    const rankRes = await query<{ rank: number }>(
      `SELECT 1 + COUNT(*)::int AS rank
       FROM user_subject_xp_totals ust
       JOIN users u ON u.id = ust.user_id
       WHERE ust.subject_id = $1::uuid
         AND u.role = 'student'
         AND u.status = 'active'
         AND LEAST(ust.xp_total, 300) > $2::int`,
      [params.subjectId, baseRow.xp_total],
    );
    const rank = Number(rankRes.rows[0]?.rank ?? 1);

    return {
      items,
      self: mapRankedLeaderboardRow({ ...baseRow, rank }),
    };
  }

  const selfBase = await query<LeaderboardRow>(
    `SELECT u.id AS user_id,
            u.full_name,
            u.avatar_url,
            (
              LEAST(u.xp_vi, 300)
              + LEAST(u.xp_en, 300)
              + LEAST(u.xp_math, 300)
              + LEAST(u.xp_sci, 300)
            )::int AS xp_total
     FROM users u
     WHERE u.id = $1
       AND u.role = 'student'
       AND u.status = 'active'`,
    [viewerUserId],
  );

  const baseRow = selfBase.rows[0];
  if (!baseRow) return { items, self: null };

  const rankRes = await query<{ rank: number }>(
    `SELECT 1 + COUNT(*)::int AS rank
     FROM users u
     WHERE u.role = 'student'
       AND u.status = 'active'
       AND (
         LEAST(u.xp_vi, 300)
         + LEAST(u.xp_en, 300)
         + LEAST(u.xp_math, 300)
         + LEAST(u.xp_sci, 300)
       )::int > $1::int`,
    [baseRow.xp_total],
  );
  const rank = Number(rankRes.rows[0]?.rank ?? 1);

  return { items, self: mapRankedLeaderboardRow({ ...baseRow, rank }) };
}

type LeaderboardTableRow = {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  xp_vi: number;
  xp_en: number;
  xp_math: number;
  xp_sci: number;
  xp_overall: number;
  rank: number;
};

function mapLeaderboardTableRow(
  row: LeaderboardTableRow,
): LeaderboardTableEntry {
  return {
    userId: row.user_id,
    fullName: row.full_name,
    avatarUrl: row.avatar_url,
    rank: Number(row.rank),
    xpVi: Number(row.xp_vi),
    xpEn: Number(row.xp_en),
    xpMath: Number(row.xp_math),
    xpSci: Number(row.xp_sci),
    xpOverall: Number(row.xp_overall),
  };
}

const sortColumns: Record<LeaderboardSortBy, string> = {
  vi: "xp_vi",
  en: "xp_en",
  math: "xp_math",
  sci: "xp_sci",
  overall: "xp_overall",
};

export async function getLeaderboardTable(params: {
  limit: number;
  offset: number;
  sortBy: LeaderboardSortBy;
  sortDir: LeaderboardSortDir;
  viewerUserId?: string | null;
  includeSelf: boolean;
}): Promise<LeaderboardTableResult> {
  const viewerUserId = params.includeSelf
    ? (params.viewerUserId ?? null)
    : null;

  const sortColumn = sortColumns[params.sortBy];
  const orderDir = params.sortDir === "asc" ? "ASC" : "DESC";
  const compareOp = params.sortDir === "asc" ? "<" : ">";

  const totalRes = await query<{ total: number }>(
    `SELECT COUNT(*)::int AS total
     FROM users u
     WHERE u.role = 'student'
       AND u.status = 'active'`,
  );
  const total = Number(totalRes.rows[0]?.total ?? 0);

  const pageRes = await query<LeaderboardTableRow>(
    `WITH scores AS (
        SELECT u.id AS user_id,
               u.full_name,
               u.avatar_url,
               LEAST(u.xp_vi, 300)::int AS xp_vi,
               LEAST(u.xp_en, 300)::int AS xp_en,
               LEAST(u.xp_math, 300)::int AS xp_math,
               LEAST(u.xp_sci, 300)::int AS xp_sci,
               (
                 LEAST(u.xp_vi, 300)
                 + LEAST(u.xp_en, 300)
                 + LEAST(u.xp_math, 300)
                 + LEAST(u.xp_sci, 300)
               )::int AS xp_overall
        FROM users u
        WHERE u.role = 'student'
          AND u.status = 'active'
      ),
      page AS (
        SELECT s.user_id,
               s.full_name,
               s.avatar_url,
               s.xp_vi,
               s.xp_en,
               s.xp_math,
               s.xp_sci,
               s.xp_overall,
               s.${sortColumn} AS sort_score
        FROM scores s
        ORDER BY s.${sortColumn} ${orderDir}, s.user_id ASC
        LIMIT $1 OFFSET $2
      ),
      ranks AS (
        SELECT DISTINCT p.sort_score AS sort_score,
               1 + (
                 SELECT COUNT(*)::int
                 FROM scores s2
                 WHERE s2.${sortColumn} ${compareOp} p.sort_score
               ) AS rank
        FROM page p
      )
      SELECT p.user_id,
             p.full_name,
             p.avatar_url,
             p.xp_vi,
             p.xp_en,
             p.xp_math,
             p.xp_sci,
             p.xp_overall,
             r.rank
      FROM page p
      JOIN ranks r ON r.sort_score = p.sort_score
      ORDER BY p.sort_score ${orderDir}, p.user_id ASC`,
    [params.limit, params.offset],
  );
  const items = pageRes.rows.map(mapLeaderboardTableRow);

  if (!params.includeSelf || !viewerUserId) {
    return { items, total, self: null };
  }

  const isInPage = items.some((entry) => entry.userId === viewerUserId);
  if (isInPage) {
    return { items, total, self: null };
  }

  const selfRes = await query<LeaderboardTableRow>(
    `WITH scores AS (
        SELECT u.id AS user_id,
               u.full_name,
               u.avatar_url,
               LEAST(u.xp_vi, 300)::int AS xp_vi,
               LEAST(u.xp_en, 300)::int AS xp_en,
               LEAST(u.xp_math, 300)::int AS xp_math,
               LEAST(u.xp_sci, 300)::int AS xp_sci,
               (
                 LEAST(u.xp_vi, 300)
                 + LEAST(u.xp_en, 300)
                 + LEAST(u.xp_math, 300)
                 + LEAST(u.xp_sci, 300)
               )::int AS xp_overall
        FROM users u
        WHERE u.role = 'student'
          AND u.status = 'active'
      )
      SELECT s.user_id,
             s.full_name,
             s.avatar_url,
             s.xp_vi,
             s.xp_en,
             s.xp_math,
             s.xp_sci,
             s.xp_overall,
             1 + (
               SELECT COUNT(*)::int
               FROM scores s2
               WHERE s2.${sortColumn} ${compareOp} s.${sortColumn}
             ) AS rank
      FROM scores s
      WHERE s.user_id = $1`,
    [viewerUserId],
  );
  const selfRow = selfRes.rows[0];
  if (!selfRow) {
    return { items, total, self: null };
  }

  return { items, total, self: mapLeaderboardTableRow(selfRow) };
}

export async function getLeaderboardTableEntryByUserId(params: {
  userId: string;
  sortBy: LeaderboardSortBy;
  sortDir: LeaderboardSortDir;
}): Promise<LeaderboardTableEntry | null> {
  const sortColumn = sortColumns[params.sortBy];
  const compareOp = params.sortDir === "asc" ? "<" : ">";

  const res = await query<LeaderboardTableRow>(
    `SELECT u.id AS user_id,
            u.full_name,
            u.avatar_url,
            u.xp_vi,
            u.xp_en,
            u.xp_math,
            u.xp_sci,
            u.xp_main_total AS xp_overall,
            1 + (
              SELECT COUNT(*)::int
              FROM users u2
              WHERE u2.role = 'student'
                AND u2.status = 'active'
                AND u2.${sortColumn} ${compareOp} u.${sortColumn}
            ) AS rank
     FROM users u
     WHERE u.id = $1
       AND u.role = 'student'
       AND u.status = 'active'`,
    [params.userId],
  );

  const row = res.rows[0];
  return row ? mapLeaderboardTableRow(row) : null;
}

export async function findActiveStudentIdByEmail(email: string) {
  const res = await query<{ id: string }>(
    `SELECT id
     FROM users
     WHERE email = $1
       AND role = 'student'
       AND status = 'active'
     LIMIT 1`,
    [email],
  );
  return res.rows[0]?.id ?? null;
}

export async function findActiveStudentIdsByFullName(params: {
  query: string;
  limit: number;
}) {
  const res = await query<{ id: string }>(
    `SELECT id
     FROM users
     WHERE role = 'student'
       AND status = 'active'
       AND lower(full_name) LIKE $1
     ORDER BY id ASC
     LIMIT $2`,
    [`%${params.query.toLowerCase()}%`, params.limit],
  );
  return res.rows.map((row) => row.id);
}
