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
  thumbnail_url text,
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

CREATE TABLE IF NOT EXISTS challenge_settings (
  quiz_id uuid PRIMARY KEY REFERENCES quizzes(id),
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  time_limit_seconds integer NOT NULL,
  rules jsonb
);

DO $$
BEGIN
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
