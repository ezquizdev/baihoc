-- BaiHoc PostgreSQL schema
-- Idempotent: uses IF NOT EXISTS and avoids destructive changes.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";

-- Enums
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('student', 'staff');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'oauth_provider') THEN
    CREATE TYPE oauth_provider AS ENUM ('google');
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_tier') THEN
    CREATE TYPE user_tier AS ENUM ('free', 'paid');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status') THEN
    CREATE TYPE user_status AS ENUM ('pending_verification', 'active', 'deactivated');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'quiz_visibility') THEN
    CREATE TYPE quiz_visibility AS ENUM ('free', 'premium');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'quiz_status') THEN
    CREATE TYPE quiz_status AS ENUM ('draft', 'published', 'archived');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'question_type') THEN
    CREATE TYPE question_type AS ENUM ('mcq_single', 'mcq_multi', 'short_answer');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'question_status') THEN
    CREATE TYPE question_status AS ENUM ('active', 'archived');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'attempt_status') THEN
    CREATE TYPE attempt_status AS ENUM ('in_progress', 'submitted', 'auto_submitted', 'abandoned');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ai_entry_point') THEN
    CREATE TYPE ai_entry_point AS ENUM ('question', 'result', 'home');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ai_message_role') THEN
    CREATE TYPE ai_message_role AS ENUM ('user', 'assistant', 'system');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'leaderboard_period') THEN
    CREATE TYPE leaderboard_period AS ENUM ('weekly', 'monthly', 'all_time');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'xp_source') THEN
    CREATE TYPE xp_source AS ENUM ('attempt', 'challenge', 'streak', 'admin_adjust');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'custom_quiz_status') THEN
    CREATE TYPE custom_quiz_status AS ENUM ('pending', 'ready', 'failed');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'job_status') THEN
    CREATE TYPE job_status AS ENUM ('pending', 'processing', 'failed', 'completed');
  END IF;
END $$;

-- Users & auth
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email citext UNIQUE NOT NULL,
  password_hash text,
  full_name text NOT NULL,
  school text,
  date_of_birth date,
  avatar_url text,
  role user_role NOT NULL DEFAULT 'student',
  tier user_tier NOT NULL DEFAULT 'free',
  status user_status NOT NULL DEFAULT 'pending_verification',
  email_verified_at timestamptz,
  oauth_provider oauth_provider,
  oauth_sub text,
  profile_completed boolean NOT NULL DEFAULT false,
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM users WHERE btrim(full_name) = '') THEN
    UPDATE users
    SET full_name = split_part(email::text, '@', 1)
    WHERE btrim(full_name) = '';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_full_name_not_blank'
      AND conrelid = 'users'::regclass
  ) THEN
    ALTER TABLE users
    ADD CONSTRAINT users_full_name_not_blank
    CHECK (length(btrim(full_name)) > 0);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_oauth_identity
ON users(oauth_provider, oauth_sub)
WHERE oauth_provider IS NOT NULL AND oauth_sub IS NOT NULL;

CREATE TABLE IF NOT EXISTS membership_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  from_tier user_tier NOT NULL,
  to_tier user_tier NOT NULL,
  reason text,
  changed_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS course_student_allowlist (
  email citext PRIMARY KEY,
  added_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'course_student_allowlist'
      AND column_name = 'role'
  ) THEN
    ALTER TABLE course_student_allowlist
    ADD COLUMN role user_role NOT NULL DEFAULT 'student';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'course_student_allowlist'
      AND column_name = 'tier'
  ) THEN
    ALTER TABLE course_student_allowlist
    ADD COLUMN tier user_tier NOT NULL DEFAULT 'paid';
  END IF;
END $$;

-- Taxonomy
CREATE TABLE IF NOT EXISTS subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES subjects(id),
  name text NOT NULL,
  slug text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(subject_id, slug)
);

-- Quizzes
CREATE TABLE IF NOT EXISTS quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  difficulty_level integer NOT NULL DEFAULT 3 CHECK (difficulty_level BETWEEN 1 AND 5),
  visibility quiz_visibility NOT NULL DEFAULT 'free',
  status quiz_status NOT NULL DEFAULT 'draft',
  is_challenge boolean NOT NULL DEFAULT false,
  estimated_time_seconds integer,
  featured_rank integer,
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  search_vector tsvector
);

CREATE INDEX IF NOT EXISTS idx_quizzes_visibility_status ON quizzes(visibility, status);
CREATE INDEX IF NOT EXISTS idx_quizzes_challenge ON quizzes(is_challenge);
CREATE INDEX IF NOT EXISTS idx_quizzes_difficulty_level ON quizzes(difficulty_level);
CREATE INDEX IF NOT EXISTS idx_quizzes_search ON quizzes USING GIN (search_vector);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'quizzes'
      AND column_name = 'thumbnail_url'
  ) THEN
    ALTER TABLE quizzes DROP COLUMN thumbnail_url;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS challenge_settings (
  quiz_id uuid PRIMARY KEY REFERENCES quizzes(id),
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  time_limit_seconds integer NOT NULL
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'challenge_settings'
      AND column_name = 'rules'
  ) THEN
    ALTER TABLE challenge_settings DROP COLUMN rules;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'challenge_settings_end_after_start'
  ) THEN
    ALTER TABLE challenge_settings
    ADD CONSTRAINT challenge_settings_end_after_start
    CHECK (end_at > start_at);
  END IF;
END $$;

-- Questions
CREATE TABLE IF NOT EXISTS questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES subjects(id),
  default_difficulty integer NOT NULL DEFAULT 3 CHECK (default_difficulty BETWEEN 1 AND 5),
  type question_type NOT NULL,
  stem text NOT NULL,
  explanation text,
  status question_status NOT NULL DEFAULT 'active',
  tags text[] NOT NULL DEFAULT '{}',
  default_score numeric(5,2) NOT NULL DEFAULT 1,
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,
  search_vector tsvector
);

CREATE INDEX IF NOT EXISTS idx_questions_subject_diff ON questions(subject_id, default_difficulty);
CREATE INDEX IF NOT EXISTS idx_questions_tags ON questions USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_questions_search ON questions USING GIN (search_vector);

CREATE TABLE IF NOT EXISTS question_topics (
  question_id uuid NOT NULL REFERENCES questions(id),
  topic_id uuid NOT NULL REFERENCES topics(id),
  PRIMARY KEY (question_id, topic_id)
);

CREATE INDEX IF NOT EXISTS idx_question_topics_topic ON question_topics(topic_id);

CREATE TABLE IF NOT EXISTS passages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text NOT NULL,
  media_urls text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS question_passages (
  question_id uuid PRIMARY KEY REFERENCES questions(id),
  passage_id uuid NOT NULL REFERENCES passages(id),
  position integer NOT NULL DEFAULT 1 CHECK (position > 0),
  UNIQUE(passage_id, position)
);

CREATE TABLE IF NOT EXISTS question_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES questions(id),
  label text,
  text text NOT NULL,
  is_correct boolean NOT NULL DEFAULT false,
  position integer NOT NULL,
  UNIQUE(question_id, position)
);

CREATE TABLE IF NOT EXISTS short_answer_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES questions(id),
  acceptable_answer text NOT NULL,
  case_sensitive boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS quiz_questions (
  quiz_id uuid NOT NULL REFERENCES quizzes(id),
  question_id uuid NOT NULL REFERENCES questions(id),
  position integer NOT NULL,
  score numeric(5,2),
  required boolean NOT NULL DEFAULT true,
  PRIMARY KEY (quiz_id, question_id),
  UNIQUE(quiz_id, position)
);

-- Custom quizzes
CREATE TABLE IF NOT EXISTS custom_quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  status custom_quiz_status NOT NULL DEFAULT 'pending',
  config jsonb NOT NULL,
  generated_quiz_id uuid REFERENCES quizzes(id),
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  ready_at timestamptz
);

-- Imports
CREATE TABLE IF NOT EXISTS quiz_import_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL REFERENCES users(id),
  status job_status NOT NULL DEFAULT 'pending',
  source_url text NOT NULL,
  error_report_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Attempts
CREATE TABLE IF NOT EXISTS attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  quiz_id uuid NOT NULL REFERENCES quizzes(id),
  challenge_id uuid REFERENCES quizzes(id),
  custom_quiz_id uuid REFERENCES custom_quizzes(id),
  status attempt_status NOT NULL DEFAULT 'in_progress',
  started_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  time_limit_seconds integer,
  remaining_seconds integer,
  score_raw numeric(6,2) NOT NULL DEFAULT 0,
  score_percent numeric(5,2) NOT NULL DEFAULT 0,
  correct_count integer NOT NULL DEFAULT 0,
  total_questions integer NOT NULL,
  irt_estimate numeric(6,2),
  xp_earned integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attempts_user_started ON attempts(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_attempts_quiz_status ON attempts(quiz_id, status);
CREATE INDEX IF NOT EXISTS idx_attempts_status_in_progress ON attempts(status) WHERE status = 'in_progress';
CREATE INDEX IF NOT EXISTS idx_attempts_submitted_recent
ON attempts(submitted_at DESC)
WHERE submitted_at IS NOT NULL AND status IN ('submitted', 'auto_submitted');

CREATE TABLE IF NOT EXISTS attempt_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES questions(id),
  selected_option_ids uuid[],
  text_answer text,
  is_correct boolean,
  awarded_score numeric(5,2),
  answered_at timestamptz NOT NULL DEFAULT now(),
  auto_saved boolean NOT NULL DEFAULT false,
  UNIQUE(attempt_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_attempt_answers_attempt ON attempt_answers(attempt_id);
CREATE INDEX IF NOT EXISTS idx_attempt_answers_selected_options ON attempt_answers USING GIN (selected_option_ids);

CREATE TABLE IF NOT EXISTS attempt_answer_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES questions(id),
  payload jsonb NOT NULL,
  event_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attempt_answer_events_attempt_created_at
ON attempt_answer_events(attempt_id, created_at DESC);

-- XP and leaderboard
CREATE TABLE IF NOT EXISTS xp_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  source xp_source NOT NULL,
  amount integer NOT NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_xp_events_user_created
ON xp_events(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_xp_events_quiz_id
ON xp_events(((metadata->>'quizId')::uuid))
WHERE metadata ? 'quizId'
  AND (metadata->>'quizId') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Denormalized XP totals (for fast leaderboards)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'xp_total'
  ) THEN
    ALTER TABLE users
    ADD COLUMN xp_total integer NOT NULL DEFAULT 0;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_users_role_status_xp_total
ON users(role, status, xp_total DESC, id ASC);

-- Denormalized main-subject totals (for sortable leaderboard tables)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'xp_vi'
  ) THEN
    ALTER TABLE users ADD COLUMN xp_vi integer NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'xp_en'
  ) THEN
    ALTER TABLE users ADD COLUMN xp_en integer NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'xp_math'
  ) THEN
    ALTER TABLE users ADD COLUMN xp_math integer NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'xp_sci'
  ) THEN
    ALTER TABLE users ADD COLUMN xp_sci integer NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'xp_main_total'
  ) THEN
    ALTER TABLE users ADD COLUMN xp_main_total integer NOT NULL DEFAULT 0;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_users_role_status_xp_main_total
ON users(role, status, xp_main_total DESC, id ASC);

CREATE INDEX IF NOT EXISTS idx_users_role_status_xp_vi
ON users(role, status, xp_vi DESC, id ASC);

CREATE INDEX IF NOT EXISTS idx_users_role_status_xp_en
ON users(role, status, xp_en DESC, id ASC);

CREATE INDEX IF NOT EXISTS idx_users_role_status_xp_math
ON users(role, status, xp_math DESC, id ASC);

CREATE INDEX IF NOT EXISTS idx_users_role_status_xp_sci
ON users(role, status, xp_sci DESC, id ASC);

CREATE TABLE IF NOT EXISTS user_subject_xp_totals (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  xp_total integer NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, subject_id)
);

CREATE INDEX IF NOT EXISTS idx_user_subject_xp_totals_subject_xp
ON user_subject_xp_totals(subject_id, xp_total DESC, user_id ASC);

CREATE OR REPLACE FUNCTION apply_xp_event_totals()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  quiz_id uuid;
  abs_amount integer;
  sign integer;
BEGIN
  -- Always keep the overall total exact.
  UPDATE users
  SET xp_total = xp_total + NEW.amount
  WHERE id = NEW.user_id;

  -- Only allocate to subjects when a valid quizId is present.
  IF NEW.metadata ? 'quizId'
     AND (NEW.metadata->>'quizId') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  THEN
    quiz_id := (NEW.metadata->>'quizId')::uuid;
    sign := CASE WHEN NEW.amount < 0 THEN -1 ELSE 1 END;
    abs_amount := abs(NEW.amount);

    WITH subject_counts AS (
      SELECT q.subject_id,
             s.slug,
             COUNT(*)::int AS cnt
      FROM quiz_questions qq
      JOIN questions q ON q.id = qq.question_id
      JOIN subjects s ON s.id = q.subject_id
      WHERE qq.quiz_id = quiz_id
      GROUP BY q.subject_id, s.slug
    ),
    totals AS (
      SELECT COALESCE(SUM(cnt), 0)::int AS total_cnt
      FROM subject_counts
    ),
    raw AS (
      SELECT sc.subject_id,
             sc.slug,
             (abs_amount::numeric * sc.cnt / NULLIF(t.total_cnt, 0)) AS raw_xp,
             FLOOR(abs_amount::numeric * sc.cnt / NULLIF(t.total_cnt, 0))::int AS base_xp
      FROM subject_counts sc
      CROSS JOIN totals t
    ),
    base_sum AS (
      SELECT COALESCE(SUM(base_xp), 0)::int AS base_sum
      FROM raw
    ),
    ranked AS (
      SELECT r.subject_id,
             r.slug,
             r.base_xp,
             (r.raw_xp - r.base_xp)::numeric AS frac,
             ROW_NUMBER() OVER (
               ORDER BY (r.raw_xp - r.base_xp) DESC, r.subject_id ASC
             ) AS frac_rank,
             (SELECT base_sum FROM base_sum) AS base_sum
      FROM raw r
    ),
	    allocated AS (
	      SELECT ranked.subject_id,
	             ranked.slug,
	             ((ranked.base_xp +
	               CASE
	                 WHEN ranked.frac_rank <= (abs_amount - ranked.base_sum) THEN 1
	                 ELSE 0
	               END) * sign)::int AS allocated_xp
	      FROM ranked
	      WHERE (ranked.base_xp > 0)
	         OR (ranked.frac_rank <= (abs_amount - ranked.base_sum))
	    )
	    , upserted AS (
	      INSERT INTO user_subject_xp_totals (user_id, subject_id, xp_total)
	      SELECT NEW.user_id,
	             allocated.subject_id,
	             allocated.allocated_xp
	      FROM allocated
	      ON CONFLICT (user_id, subject_id)
	      DO UPDATE SET xp_total = user_subject_xp_totals.xp_total + EXCLUDED.xp_total
	      RETURNING 1
	    ),
	    sums AS (
	      SELECT COALESCE(SUM(CASE WHEN allocated.slug = 'vi' THEN allocated.allocated_xp END), 0)::int AS add_vi,
	             COALESCE(SUM(CASE WHEN allocated.slug = 'en' THEN allocated.allocated_xp END), 0)::int AS add_en,
	             COALESCE(SUM(CASE WHEN allocated.slug = 'math' THEN allocated.allocated_xp END), 0)::int AS add_math,
	             COALESCE(SUM(CASE WHEN allocated.slug = 'sci' THEN allocated.allocated_xp END), 0)::int AS add_sci,
	             COALESCE(SUM(CASE WHEN allocated.slug IN ('vi', 'en', 'math', 'sci') THEN allocated.allocated_xp END), 0)::int AS add_main_total
	      FROM allocated
	    ),
	    gate AS (
	      SELECT 1 AS ok FROM upserted LIMIT 1
	    )
	    UPDATE users
	    SET xp_vi = xp_vi + sums.add_vi,
	        xp_en = xp_en + sums.add_en,
	        xp_math = xp_math + sums.add_math,
	        xp_sci = xp_sci + sums.add_sci,
	        xp_main_total = xp_main_total + sums.add_main_total
	    FROM sums, gate
	    WHERE users.id = NEW.user_id;
	  END IF;

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_xp_events_apply_totals'
  ) THEN
    CREATE TRIGGER trg_xp_events_apply_totals
    AFTER INSERT ON xp_events
    FOR EACH ROW
    EXECUTE FUNCTION apply_xp_event_totals();
  END IF;
END $$;

-- One-time backfill when totals are newly introduced (best-effort, idempotent)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM xp_events LIMIT 1)
     AND COALESCE((SELECT MAX(xp_total) FROM users), 0) = 0
  THEN
    UPDATE users u
    SET xp_total = COALESCE(t.xp_total, 0)
    FROM (
      SELECT user_id, SUM(amount)::int AS xp_total
      FROM xp_events
      GROUP BY user_id
    ) t
    WHERE u.id = t.user_id;

    UPDATE users u
    SET xp_total = 0
    WHERE NOT EXISTS (
      SELECT 1 FROM xp_events x WHERE x.user_id = u.id
    );

    -- Rebuild subject totals using the same proportional allocation approach.
    -- Note: this is approximate for historical events; new events are allocated exactly via trigger.
    TRUNCATE TABLE user_subject_xp_totals;
    WITH quiz_xp AS (
      SELECT x.user_id,
             x.amount,
             (x.metadata->>'quizId')::uuid AS quiz_id
      FROM xp_events x
      WHERE x.metadata ? 'quizId'
        AND (x.metadata->>'quizId') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
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
    )
    INSERT INTO user_subject_xp_totals (user_id, subject_id, xp_total)
    SELECT user_id,
           subject_id,
           ROUND(SUM(allocated_xp))::int AS xp_total
    FROM allocations
    GROUP BY user_id, subject_id;
  END IF;
END $$;

-- Backfill main-subject totals when introduced (idempotent; uses existing subject totals when present).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM xp_events LIMIT 1)
     AND COALESCE((SELECT MAX(xp_main_total) FROM users), 0) = 0
  THEN
    WITH totals AS (
      SELECT u.id AS user_id,
             COALESCE(MAX(CASE WHEN s.slug = 'vi' THEN ust.xp_total END), 0)::int AS xp_vi,
             COALESCE(MAX(CASE WHEN s.slug = 'en' THEN ust.xp_total END), 0)::int AS xp_en,
             COALESCE(MAX(CASE WHEN s.slug = 'math' THEN ust.xp_total END), 0)::int AS xp_math,
             COALESCE(MAX(CASE WHEN s.slug = 'sci' THEN ust.xp_total END), 0)::int AS xp_sci
      FROM users u
      LEFT JOIN user_subject_xp_totals ust ON ust.user_id = u.id
      LEFT JOIN subjects s ON s.id = ust.subject_id
      GROUP BY u.id
    )
    UPDATE users u
    SET xp_vi = t.xp_vi,
        xp_en = t.xp_en,
        xp_math = t.xp_math,
        xp_sci = t.xp_sci,
        xp_main_total = (t.xp_vi + t.xp_en + t.xp_math + t.xp_sci)
    FROM totals t
    WHERE u.id = t.user_id;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS leaderboard_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period leaderboard_period NOT NULL,
  subject_id uuid REFERENCES subjects(id),
  generated_at timestamptz NOT NULL DEFAULT now(),
  data jsonb NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_snapshots_period ON leaderboard_snapshots(period, subject_id, generated_at DESC);

-- AI logs
CREATE TABLE IF NOT EXISTS ai_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  entry_point ai_entry_point NOT NULL,
  quiz_id uuid REFERENCES quizzes(id),
  attempt_id uuid REFERENCES attempts(id),
  question_id uuid REFERENCES questions(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES ai_sessions(id) ON DELETE CASCADE,
  role ai_message_role NOT NULL,
  content text NOT NULL,
  token_usage jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_failures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES ai_sessions(id) ON DELETE CASCADE,
  error_type text NOT NULL,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Audit
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES users(id),
  action text NOT NULL,
  target_type text,
  target_id uuid,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_logs(actor_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_target ON audit_logs(target_type, target_id);

CREATE TABLE IF NOT EXISTS user_status_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  from_status user_status NOT NULL,
  to_status user_status NOT NULL,
  reason text,
  changed_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Challenge constraint: once-per-user per challenge quiz
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'attempts_unique_challenge_per_user'
  ) THEN
    ALTER TABLE attempts ADD CONSTRAINT attempts_unique_challenge_per_user
    UNIQUE (user_id, challenge_id) DEFERRABLE INITIALLY IMMEDIATE;
  END IF;
END $$;
