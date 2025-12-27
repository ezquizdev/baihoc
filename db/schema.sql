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

-- Allow deleting quizzes while preserving custom quiz records.
DO $$
DECLARE
  fk_name text;
  fk_deltype char;
BEGIN
  SELECT conname INTO fk_name
  FROM pg_constraint
  WHERE contype = 'f'
    AND conrelid = 'custom_quizzes'::regclass
    AND conkey = ARRAY[
      (SELECT attnum FROM pg_attribute WHERE attrelid = 'custom_quizzes'::regclass AND attname = 'generated_quiz_id')
    ];

  SELECT confdeltype INTO fk_deltype
  FROM pg_constraint
  WHERE conname = 'custom_quizzes_generated_quiz_id_fkey';

  -- Desired: ON DELETE SET NULL (confdeltype = 'n').
  IF fk_name IS NULL OR fk_deltype IS NULL OR fk_deltype <> 'n' THEN
    IF fk_name IS NOT NULL THEN
      EXECUTE format('ALTER TABLE custom_quizzes DROP CONSTRAINT %I', fk_name);
    END IF;

    ALTER TABLE custom_quizzes
    ADD CONSTRAINT custom_quizzes_generated_quiz_id_fkey
    FOREIGN KEY (generated_quiz_id) REFERENCES quizzes(id) ON DELETE SET NULL;
  END IF;
END $$;

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
  judged_at timestamptz,
  judgement_version integer NOT NULL DEFAULT 1,
  quiz_content_hash_snapshot text,
  snapshot_quiz_title text,
  snapshot_quiz_difficulty_level integer CHECK (snapshot_quiz_difficulty_level BETWEEN 1 AND 5),
  snapshot_quiz_estimated_time_seconds integer,
  snapshot_quiz_is_challenge boolean,
  snapshot_subject_scores jsonb,
  snapshot_subject_scores_estimated boolean NOT NULL DEFAULT false,
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

-- Snapshot + rejudge support (idempotent schema evolution).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'attempts'
      AND column_name = 'judged_at'
  ) THEN
    ALTER TABLE attempts ADD COLUMN judged_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'attempts'
      AND column_name = 'judgement_version'
  ) THEN
    ALTER TABLE attempts ADD COLUMN judgement_version integer NOT NULL DEFAULT 1;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'attempts'
      AND column_name = 'quiz_content_hash_snapshot'
  ) THEN
    ALTER TABLE attempts ADD COLUMN quiz_content_hash_snapshot text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'attempts'
      AND column_name = 'snapshot_quiz_title'
  ) THEN
    ALTER TABLE attempts ADD COLUMN snapshot_quiz_title text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'attempts'
      AND column_name = 'snapshot_quiz_difficulty_level'
  ) THEN
    ALTER TABLE attempts
    ADD COLUMN snapshot_quiz_difficulty_level integer CHECK (snapshot_quiz_difficulty_level BETWEEN 1 AND 5);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'attempts'
      AND column_name = 'snapshot_quiz_estimated_time_seconds'
  ) THEN
    ALTER TABLE attempts ADD COLUMN snapshot_quiz_estimated_time_seconds integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'attempts'
      AND column_name = 'snapshot_quiz_is_challenge'
  ) THEN
    ALTER TABLE attempts ADD COLUMN snapshot_quiz_is_challenge boolean;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'attempts'
      AND column_name = 'snapshot_subject_scores'
  ) THEN
    ALTER TABLE attempts ADD COLUMN snapshot_subject_scores jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'attempts'
      AND column_name = 'snapshot_subject_scores_estimated'
  ) THEN
    ALTER TABLE attempts ADD COLUMN snapshot_subject_scores_estimated boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- Allow deleting quizzes while preserving attempts (snapshot-backed history/review).
DO $$
DECLARE
  c record;
BEGIN
  FOR c IN (
    SELECT conname
    FROM pg_constraint
    WHERE contype = 'f'
      AND conrelid = 'attempts'::regclass
      AND conkey && ARRAY[
        (SELECT attnum FROM pg_attribute WHERE attrelid = 'attempts'::regclass AND attname = 'quiz_id'),
        (SELECT attnum FROM pg_attribute WHERE attrelid = 'attempts'::regclass AND attname = 'challenge_id')
      ]
  ) LOOP
    EXECUTE format('ALTER TABLE attempts DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS idx_attempts_user_started ON attempts(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_attempts_user_completed_started
ON attempts(user_id, started_at DESC)
WHERE status IN ('submitted', 'auto_submitted');
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

-- Allow deleting questions while preserving attempt history snapshots.
DO $$
DECLARE
  c record;
BEGIN
  FOR c IN (
    SELECT conname, conrelid
    FROM pg_constraint
    WHERE contype = 'f'
      AND conrelid IN ('attempt_answers'::regclass, 'attempt_answer_events'::regclass)
      AND conkey && ARRAY[
        (SELECT attnum FROM pg_attribute WHERE attrelid = 'attempt_answers'::regclass AND attname = 'question_id')
      ]
  ) LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', c.conrelid::regclass, c.conname);
  END LOOP;
END $$;

CREATE TABLE IF NOT EXISTS attempt_question_snapshots (
  attempt_id uuid NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  judgement_version integer NOT NULL DEFAULT 1,
  position integer NOT NULL CHECK (position > 0),
  question_id uuid NOT NULL,
  question_type question_type NOT NULL,
  max_score numeric(5,2) NOT NULL DEFAULT 1,
  required boolean NOT NULL DEFAULT true,
  subject_id uuid NOT NULL,
  subject_name text NOT NULL,
  subject_slug text NOT NULL,
  question_updated_at timestamptz NOT NULL,
  PRIMARY KEY (attempt_id, judgement_version, position),
  UNIQUE (attempt_id, judgement_version, question_id)
);

CREATE INDEX IF NOT EXISTS idx_attempt_question_snapshots_attempt_version
ON attempt_question_snapshots(attempt_id, judgement_version);

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

-- Defensive patch: some environments may have a legacy trigger function on `xp_events`
-- that errors due to a variable/column name collision (`quiz_id`). We don't create any
-- triggers here, but if the function exists we ensure it is safe.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'apply_xp_event_totals'
      AND n.nspname = 'public'
  )
  AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'xp_total'
  )
  AND EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'user_subject_xp_totals'
  ) THEN
    EXECUTE $sql$
      CREATE OR REPLACE FUNCTION public.apply_xp_event_totals()
       RETURNS trigger
       LANGUAGE plpgsql
      AS $fn$
      DECLARE
        v_quiz_id uuid;
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
          v_quiz_id := (NEW.metadata->>'quizId')::uuid;
          sign := CASE WHEN NEW.amount < 0 THEN -1 ELSE 1 END;
          abs_amount := abs(NEW.amount);

          WITH subject_counts AS (
            SELECT q.subject_id,
                   s.slug,
                   COUNT(*)::int AS cnt
            FROM quiz_questions qq
            JOIN questions q ON q.id = qq.question_id
            JOIN subjects s ON s.id = q.subject_id
            WHERE qq.quiz_id = v_quiz_id
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
      $fn$;
    $sql$;
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
