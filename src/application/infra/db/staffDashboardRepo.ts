import { query } from "@/application/infra/db/pool";

export async function getStudentCount(): Promise<number> {
  const res = await query<{ count: number }>(
    `SELECT COUNT(*)::int AS count
     FROM users
     WHERE role = 'student' AND status = 'active'`,
  );
  return res.rows[0]?.count ?? 0;
}

export async function getQuestionCount(): Promise<number> {
  const res = await query<{ count: number }>(
    `SELECT COUNT(*)::int AS count
     FROM questions
     WHERE status = 'active'`,
  );
  return res.rows[0]?.count ?? 0;
}

export async function getQuizAndChallengeCounts(): Promise<{
  quizCount: number;
  challengeCount: number;
}> {
  const res = await query<{ quiz_count: number; challenge_count: number }>(
    `SELECT COUNT(*) FILTER (WHERE is_challenge = false)::int AS quiz_count,
            COUNT(*) FILTER (WHERE is_challenge = true)::int AS challenge_count
     FROM quizzes
     WHERE status = 'published'`,
  );
  return {
    quizCount: res.rows[0]?.quiz_count ?? 0,
    challengeCount: res.rows[0]?.challenge_count ?? 0,
  };
}

export async function getAttemptsTodayCount(): Promise<number> {
  const res = await query<{ count: number }>(
    `SELECT COUNT(*)::int AS count
     FROM attempts
     WHERE status IN ('submitted', 'auto_submitted')
       AND submitted_at IS NOT NULL
       AND submitted_at >= date_trunc('day', now())
       AND submitted_at < date_trunc('day', now()) + interval '1 day'`,
  );
  return res.rows[0]?.count ?? 0;
}

type MostWrongTopicRow = {
  subject_name: string;
  subject_slug: string;
  topic_name: string;
  wrong_count: number;
};

export async function getMostWrongTopic(windowDays: number): Promise<{
  subjectName: string;
  subjectSlug: string;
  topicName: string;
  wrongCount: number;
} | null> {
  const res = await query<MostWrongTopicRow>(
    `SELECT s.name AS subject_name,
            s.slug AS subject_slug,
            t.name AS topic_name,
            COUNT(*)::int AS wrong_count
     FROM attempt_answers aa
     JOIN attempts a ON a.id = aa.attempt_id
     JOIN question_topics qt ON qt.question_id = aa.question_id
     JOIN topics t ON t.id = qt.topic_id
     JOIN subjects s ON s.id = t.subject_id
     WHERE aa.is_correct = false
       AND a.status IN ('submitted', 'auto_submitted')
       AND a.submitted_at IS NOT NULL
       AND a.submitted_at >= now() - ($1::int * interval '1 day')
     GROUP BY s.name, s.slug, t.name
     ORDER BY wrong_count DESC
     LIMIT 1`,
    [windowDays],
  );
  const row = res.rows[0];
  if (!row) return null;
  return {
    subjectName: row.subject_name,
    subjectSlug: row.subject_slug,
    topicName: row.topic_name,
    wrongCount: row.wrong_count,
  };
}

type RecentAttemptRow = {
  attempt_id: string;
  submitted_at: string;
  user_id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  quiz_id: string;
  quiz_title: string;
  is_challenge: boolean;
};

export async function listRecentAttempts(limit: number): Promise<
  Array<{
    attemptId: string;
    submittedAt: string;
    studentId: string;
    studentName: string;
    studentAvatarUrl: string | null;
    quizId: string;
    quizTitle: string;
    isChallenge: boolean;
  }>
> {
  const res = await query<RecentAttemptRow>(
    `SELECT a.id AS attempt_id,
            a.submitted_at,
            u.id AS user_id,
            u.full_name,
            u.email,
            u.avatar_url,
            q.id AS quiz_id,
            q.title AS quiz_title,
            q.is_challenge
     FROM attempts a
     JOIN users u ON u.id = a.user_id
     JOIN quizzes q ON q.id = a.quiz_id
     WHERE a.status IN ('submitted', 'auto_submitted')
       AND a.submitted_at IS NOT NULL
     ORDER BY a.submitted_at DESC
     LIMIT $1`,
    [limit],
  );
  return res.rows.map((row) => ({
    attemptId: row.attempt_id,
    submittedAt: row.submitted_at,
    studentId: row.user_id,
    studentName: row.full_name || row.email,
    studentAvatarUrl: row.avatar_url,
    quizId: row.quiz_id,
    quizTitle: row.quiz_title,
    isChallenge: row.is_challenge,
  }));
}

type StudentXpTotalRow = {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  xp_total: number;
};

export async function listStudentXpTotals(): Promise<
  Array<{
    userId: string;
    fullName: string;
    avatarUrl: string | null;
    xpTotal: number;
  }>
> {
  const res = await query<StudentXpTotalRow>(
    `SELECT u.id AS user_id,
            u.full_name,
            u.avatar_url,
            u.xp_total::int AS xp_total
     FROM users u
     WHERE u.role = 'student' AND u.status = 'active'
     ORDER BY u.created_at ASC`,
  );
  return res.rows.map((row) => ({
    userId: row.user_id,
    fullName: row.full_name,
    avatarUrl: row.avatar_url,
    xpTotal: Number(row.xp_total),
  }));
}

type StudentSubjectXpTotalRow = {
  user_id: string;
  subject_id: string;
  xp_total: number;
};

export async function listStudentSubjectXpTotals(
  subjectIds: string[],
): Promise<Array<{ userId: string; subjectId: string; xpTotal: number }>> {
  const res = await query<StudentSubjectXpTotalRow>(
    `SELECT user_id,
            subject_id,
            xp_total
     FROM user_subject_xp_totals
     WHERE subject_id = ANY($1::uuid[])`,
    [subjectIds],
  );
  return res.rows.map((row) => ({
    userId: row.user_id,
    subjectId: row.subject_id,
    xpTotal: Number(row.xp_total),
  }));
}

type DailySubjectAnswerStatsRow = {
  day: string;
  subject_slug: string;
  total_count: number;
  correct_count: number;
};

export async function listDailySubjectAnswerStats(
  windowDays: number,
  subjectSlugs: string[],
): Promise<
  Array<{
    day: string;
    subjectSlug: string;
    totalCount: number;
    correctCount: number;
  }>
> {
  const res = await query<DailySubjectAnswerStatsRow>(
    `WITH days AS (
      SELECT generate_series(
        date_trunc('day', now())::date - ($1::int - 1),
        date_trunc('day', now())::date,
        interval '1 day'
      )::date AS day
    ),
    subject_slugs AS (
      SELECT unnest($2::text[]) AS subject_slug
    ),
    aggregates AS (
      SELECT date_trunc('day', a.submitted_at)::date AS day,
             s.slug AS subject_slug,
             COUNT(*)::int AS total_count,
             COUNT(*) FILTER (WHERE aa.is_correct = true)::int AS correct_count
      FROM attempt_answers aa
      JOIN attempts a ON a.id = aa.attempt_id
      JOIN questions q ON q.id = aa.question_id
      JOIN subjects s ON s.id = q.subject_id
      WHERE a.status IN ('submitted', 'auto_submitted')
        AND a.submitted_at IS NOT NULL
        AND a.submitted_at >= date_trunc('day', now()) - (($1::int - 1) * interval '1 day')
        AND a.submitted_at < date_trunc('day', now()) + interval '1 day'
        AND aa.auto_saved = false
        AND aa.is_correct IS NOT NULL
        AND s.slug = ANY($2::text[])
      GROUP BY 1, 2
    )
    SELECT d.day::text AS day,
           sl.subject_slug,
           COALESCE(a.total_count, 0)::int AS total_count,
           COALESCE(a.correct_count, 0)::int AS correct_count
    FROM days d
    CROSS JOIN subject_slugs sl
    LEFT JOIN aggregates a
      ON a.day = d.day AND a.subject_slug = sl.subject_slug
    ORDER BY d.day ASC, sl.subject_slug ASC`,
    [windowDays, subjectSlugs],
  );

  return res.rows.map((row) => ({
    day: row.day,
    subjectSlug: row.subject_slug,
    totalCount: row.total_count,
    correctCount: row.correct_count,
  }));
}
