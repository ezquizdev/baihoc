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
  topic_name: string;
  wrong_count: number;
};

export async function getMostWrongTopic(windowDays: number): Promise<{
  subjectName: string;
  topicName: string;
  wrongCount: number;
} | null> {
  const res = await query<MostWrongTopicRow>(
    `SELECT s.name AS subject_name,
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
     GROUP BY s.name, t.name
     ORDER BY wrong_count DESC
     LIMIT 1`,
    [windowDays],
  );
  const row = res.rows[0];
  if (!row) return null;
  return {
    subjectName: row.subject_name,
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
  email: string;
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
            u.email,
            u.avatar_url,
            COALESCE(SUM(x.amount), 0)::int AS xp_total
     FROM users u
     LEFT JOIN xp_events x ON x.user_id = u.id
     WHERE u.role = 'student' AND u.status = 'active'
     GROUP BY u.id, u.full_name, u.email, u.avatar_url
     ORDER BY u.created_at ASC`,
  );
  return res.rows.map((row) => ({
    userId: row.user_id,
    fullName: row.full_name || row.email,
    avatarUrl: row.avatar_url,
    xpTotal: Number(row.xp_total),
  }));
}

type StudentSubjectXpTotalRow = {
  user_id: string;
  subject_id: string;
  xp_total: number;
};

const uuidRegex =
  "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$";

export async function listStudentSubjectXpTotals(
  subjectIds: string[],
): Promise<Array<{ userId: string; subjectId: string; xpTotal: number }>> {
  const res = await query<StudentSubjectXpTotalRow>(
    `WITH quiz_xp AS (
      SELECT x.user_id,
             x.amount,
             (x.metadata->>'quizId')::uuid AS quiz_id
      FROM xp_events x
      WHERE x.metadata ? 'quizId'
        AND (x.metadata->>'quizId') ~* $2
    ),
    quiz_subject_counts AS (
      SELECT qq.quiz_id,
             q.subject_id,
             COUNT(*)::int AS subject_question_count
      FROM quiz_questions qq
      JOIN questions q ON q.id = qq.question_id
      GROUP BY qq.quiz_id, q.subject_id
    ),
    quiz_total_counts AS (
      SELECT quiz_id,
             SUM(subject_question_count)::int AS total_question_count
      FROM quiz_subject_counts
      GROUP BY quiz_id
    ),
    allocations AS (
      SELECT qx.user_id,
             qsc.subject_id,
             (qx.amount::numeric * qsc.subject_question_count / NULLIF(qtc.total_question_count, 0)) AS allocated_xp
      FROM quiz_xp qx
      JOIN quiz_subject_counts qsc ON qsc.quiz_id = qx.quiz_id
      JOIN quiz_total_counts qtc ON qtc.quiz_id = qsc.quiz_id
      WHERE qsc.subject_id = ANY($1::uuid[])
    )
    SELECT user_id,
           subject_id,
           ROUND(SUM(allocated_xp))::int AS xp_total
    FROM allocations
    GROUP BY user_id, subject_id`,
    [subjectIds, uuidRegex],
  );
  return res.rows.map((row) => ({
    userId: row.user_id,
    subjectId: row.subject_id,
    xpTotal: Number(row.xp_total),
  }));
}
