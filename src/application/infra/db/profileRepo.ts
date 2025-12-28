import { query } from "@/application/infra/db/pool";

type UserXpSummaryRow = {
  xp_total: number | string;
  xp_vi: number | string;
  xp_en: number | string;
  xp_math: number | string;
  xp_sci: number | string;
};

type ProfileAggregateRow = {
  completed_quiz_count: number | string;
  active_days_30d: number | string;
  study_seconds: number | string;
  avg_score_percent: number | string;
};

type WeeklyAnswerCountRow = {
  dow: number | string;
  correct: number | string;
  wrong: number | string;
};

function toInt(value: number | string | null | undefined) {
  if (value === null || value === undefined) return 0;
  return typeof value === "number" ? value : Number(value);
}

export async function getUserXpSummary(userId: string) {
  const res = await query<UserXpSummaryRow>(
    `SELECT (
        LEAST(xp_vi, 300)
        + LEAST(xp_en, 300)
        + LEAST(xp_math, 300)
        + LEAST(xp_sci, 300)
      )::int AS xp_total,
      LEAST(xp_vi, 300)::int AS xp_vi,
      LEAST(xp_en, 300)::int AS xp_en,
      LEAST(xp_math, 300)::int AS xp_math,
      LEAST(xp_sci, 300)::int AS xp_sci
     FROM users
     WHERE id = $1
     LIMIT 1`,
    [userId],
  );
  const row = res.rows[0];
  if (!row) return null;
  return {
    totalXp: toInt(row.xp_total),
    xpVi: toInt(row.xp_vi),
    xpEn: toInt(row.xp_en),
    xpMath: toInt(row.xp_math),
    xpSci: toInt(row.xp_sci),
  };
}

export async function getProfileAggregates(userId: string) {
  const res = await query<ProfileAggregateRow>(
    `SELECT COUNT(DISTINCT a.quiz_id)::int AS completed_quiz_count,
            COUNT(DISTINCT a.started_at::date) FILTER (
              WHERE a.started_at >= (CURRENT_DATE - INTERVAL '29 days')
            )::int AS active_days_30d,
            COALESCE(
              SUM(
                GREATEST(
                  0,
                  CASE
                    WHEN a.time_limit_seconds IS NOT NULL
                      AND a.remaining_seconds IS NOT NULL
                      THEN a.time_limit_seconds - a.remaining_seconds
                    ELSE LEAST(
                      EXTRACT(EPOCH FROM (a.submitted_at - a.started_at))::int,
                      COALESCE(q.estimated_time_seconds, 3600) * 2
                    )
                  END
                )
              )::int,
              0
            ) AS study_seconds,
            COALESCE(ROUND(AVG(a.score_percent))::int, 0) AS avg_score_percent
     FROM attempts a
     LEFT JOIN quizzes q ON q.id = a.quiz_id
     WHERE a.user_id = $1
       AND a.status IN ('submitted', 'auto_submitted')
       AND a.submitted_at IS NOT NULL`,
    [userId],
  );
  const row = res.rows[0];
  return {
    completedQuizCount: toInt(row?.completed_quiz_count),
    activeDays30d: toInt(row?.active_days_30d),
    studySeconds: toInt(row?.study_seconds),
    averageScorePercent: toInt(row?.avg_score_percent),
  };
}

export async function listWeeklyAnswerCounts(userId: string) {
  const res = await query<WeeklyAnswerCountRow>(
    `WITH days AS (
      SELECT (CURRENT_DATE - offs)::date AS day
      FROM generate_series(6, 0, -1) AS offs
    )
    SELECT EXTRACT(DOW FROM d.day)::int AS dow,
           COALESCE(SUM(CASE WHEN aa.is_correct IS TRUE THEN 1 ELSE 0 END), 0)::int AS correct,
           COALESCE(SUM(CASE WHEN aa.is_correct IS FALSE THEN 1 ELSE 0 END), 0)::int AS wrong
    FROM days d
    LEFT JOIN attempts a
      ON a.user_id = $1
     AND a.status IN ('submitted', 'auto_submitted')
     AND a.submitted_at IS NOT NULL
     AND a.submitted_at::date = d.day
    LEFT JOIN attempt_answers aa
      ON aa.attempt_id = a.id
     AND aa.is_correct IS NOT NULL
    GROUP BY d.day
    ORDER BY d.day ASC`,
    [userId],
  );
  return res.rows.map((row) => ({
    dow: toInt(row.dow),
    correct: toInt(row.correct),
    wrong: toInt(row.wrong),
  }));
}
