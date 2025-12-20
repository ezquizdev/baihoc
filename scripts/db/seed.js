/* eslint-disable no-console */
const fs = require("node:fs");
const crypto = require("node:crypto");
const { Client } = require("pg");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");

const envFile = fs.existsSync(".env.local") ? ".env.local" : ".env";
if (fs.existsSync(envFile)) {
  dotenv.config({ path: envFile });
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.warn(
    "Database seed skipped: DATABASE_URL is missing. Add it to your .env.local/.env.",
  );
  process.exit(0);
}

const args = parseArgs(process.argv.slice(2));
const config = {
  students: Number(args.students ?? 32),
  quizzes: Number(args.quizzes ?? 36),
  questionsPerSubject: Number(args.questions ?? 48),
  maxAttemptsPerQuiz: Number(args.maxAttempts ?? 18),
  seed: args.seed ?? crypto.randomUUID(),
};

const subjectSeeds = [
  { name: "Toán học", slug: "math" },
  { name: "Tiếng Anh", slug: "en" },
  { name: "Tiếng Việt", slug: "vi" },
  { name: "Tư duy Khoa học", slug: "sci" },
  { name: "Lịch sử", slug: "history" },
  { name: "Địa lý", slug: "geo" },
];

const quizNameParts = [
  "Cơ bản",
  "Nâng cao",
  "Chinh phục",
  "Đột phá",
  "Tổng ôn",
  "Thực hành",
  "Trọng tâm",
  "Ứng dụng",
  "Bứt phá",
  "Tăng tốc",
];

const peopleFirst = [
  "An",
  "Bình",
  "Châu",
  "Duy",
  "Giang",
  "Hà",
  "Hải",
  "Hương",
  "Khánh",
  "Lan",
  "Linh",
  "Minh",
  "Ngọc",
  "Nhi",
  "Phúc",
  "Quân",
  "Quỳnh",
  "Sơn",
  "Trang",
  "Tuấn",
  "Vy",
  "Yến",
];

const peopleLast = [
  "Nguyễn",
  "Trần",
  "Lê",
  "Phạm",
  "Hoàng",
  "Huỳnh",
  "Võ",
  "Đặng",
  "Bùi",
  "Đỗ",
  "Hồ",
  "Ngô",
];

const difficultyLevels = ["easy", "medium", "hard", "mixed"];
const quizVisibility = ["free", "premium"];

async function main() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log("Seeding database with config:", config);

    const staff = await ensureUser(client, {
      email: "staff@baihoc.dev",
      fullName: "BaiHoc Staff",
      role: "staff",
      tier: "paid",
      status: "active",
      password: "Password123!",
    });

    const students = [];
    for (let i = 0; i < config.students; i += 1) {
      const fullName = `${pick(peopleLast)} ${pick(peopleFirst)}`;
      const email = `student.${i + 1}@baihoc.dev`;
      const student = await ensureUser(client, {
        email,
        fullName,
        role: "student",
        tier: Math.random() < 0.2 ? "paid" : "free",
        status: "active",
        password: "Password123!",
      });
      students.push(student);
    }

    const subjects = [];
    for (const seed of subjectSeeds) {
      const subject = await ensureSubject(client, seed.name, seed.slug);
      subjects.push(subject);
    }

    const questionBank = new Map();
    for (const subject of subjects) {
      const questionIds = [];
      for (let i = 0; i < config.questionsPerSubject; i += 1) {
        const difficulty = pick(difficultyLevels);
        const stem = `Câu hỏi ${i + 1} về ${subject.name}`;
        const explanation = `Giải thích cho câu hỏi ${i + 1} (${subject.name}).`;
        const questionId = await insertQuestion(client, {
          subjectId: subject.id,
          subjectSlug: subject.slug,
          difficulty,
          stem,
          explanation,
          createdBy: staff.id,
        });
        questionIds.push(questionId);
      }
      questionBank.set(subject.id, questionIds);
    }

    const quizzes = [];
    for (let i = 0; i < config.quizzes; i += 1) {
      const subject = pick(subjects);
      const difficulty = pick(difficultyLevels);
      const visibility = pick(quizVisibility);
      const isChallenge = Math.random() < 0.2;
      const title = `${subject.name} ${pick(quizNameParts)} #${i + 1}`;
      const description = `Bộ câu hỏi ${title.toLowerCase()} dành cho luyện tập.`;
      const minutes = randomInt(10, 50);
      const timestamps = randomTimestamps(120);

      const quiz = await insertQuiz(client, {
        title,
        description,
        subjectId: subject.id,
        difficulty,
        visibility,
        isChallenge,
        estimatedTimeSeconds: minutes * 60,
        createdBy: staff.id,
        createdAt: timestamps.createdAt,
        updatedAt: timestamps.updatedAt,
      });
      quizzes.push({ ...quiz, subjectId: subject.id, isChallenge });

      if (isChallenge) {
        await insertChallenge(client, {
          quizId: quiz.id,
          startAt: shiftDate(timestamps.updatedAt, -1),
          endAt: shiftDate(timestamps.updatedAt, 7),
          timeLimitSeconds: minutes * 60,
        });
      }

      const subjectQuestions = questionBank.get(subject.id) ?? [];
      const questionCount = Math.min(
        randomInt(8, 30),
        subjectQuestions.length,
      );
      const selectedQuestions = sample(subjectQuestions, questionCount);
      await insertQuizQuestions(client, quiz.id, selectedQuestions);

      const attemptCount = randomInt(0, config.maxAttemptsPerQuiz);
      const attemptUsers = sample(students, attemptCount);
      await insertAttempts(client, {
        quizId: quiz.id,
        totalQuestions: questionCount,
        users: attemptUsers,
        updatedAt: timestamps.updatedAt,
        estimatedTimeSeconds: minutes * 60,
      });
    }

    console.log(
      `Seed complete: ${subjects.length} subjects, ${students.length} students, ${quizzes.length} quizzes.`,
    );
    console.log("Login creds: staff@baihoc.dev / Password123!");
    console.log("Sample student: student.1@baihoc.dev / Password123!");
  } catch (error) {
    console.error("Seed failed:", error.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

function parseArgs(argv) {
  return argv.reduce((acc, arg) => {
    const [key, value] = arg.replace(/^--/, "").split("=");
    if (!key) return acc;
    acc[key] = value ?? true;
    return acc;
  }, {});
}

async function ensureUser(client, input) {
  const existing = await client.query(
    `SELECT id, email, full_name FROM users WHERE email = $1 LIMIT 1`,
    [input.email],
  );
  if (existing.rows[0]) {
    return existing.rows[0];
  }

  const passwordHash = input.password
    ? bcrypt.hashSync(input.password, 10)
    : null;

  const res = await client.query(
    `INSERT INTO users (
      email, password_hash, full_name, role, tier, status,
      email_verified_at, profile_completed
    ) VALUES (
      $1, $2, $3,
      $4::user_role,
      $5::user_tier,
      $6::user_status,
      now(),
      true
    ) RETURNING id, email, full_name`,
    [
      input.email,
      passwordHash,
      input.fullName,
      input.role,
      input.tier,
      input.status,
    ],
  );
  return res.rows[0];
}

async function ensureSubject(client, name, slug) {
  const existing = await client.query(
    `SELECT id, name, slug FROM subjects WHERE slug = $1 LIMIT 1`,
    [slug],
  );
  if (existing.rows[0]) return existing.rows[0];

  const res = await client.query(
    `INSERT INTO subjects (name, slug)
     VALUES ($1, $2)
     RETURNING id, name, slug`,
    [name, slug],
  );
  return res.rows[0];
}

async function insertQuestion(client, input) {
  const res = await client.query(
    `INSERT INTO questions (
      subject_id, default_difficulty, type, stem, explanation, status,
      tags, default_score, created_by, search_vector
    ) VALUES (
      $1, $2::difficulty_level, 'mcq_single', $3, $4, 'active',
      $5::text[], 1, $6,
      to_tsvector('simple', coalesce($3, '') || ' ' || coalesce($4, ''))
    ) RETURNING id`,
    [
      input.subjectId,
      input.difficulty,
      input.stem,
      input.explanation,
      [input.subjectSlug],
      input.createdBy,
    ],
  );
  return res.rows[0].id;
}

async function insertQuiz(client, input) {
  const res = await client.query(
    `INSERT INTO quizzes (
      title, description, subject_id, difficulty, visibility, status,
      is_challenge, estimated_time_seconds, rating_count, rating_avg,
      created_by, created_at, updated_at, published_at, search_vector
    ) VALUES (
      $1, $2, $3,
      $4::difficulty_level, $5::quiz_visibility, 'published',
      $6, $7, 0, 0,
      $8, $9, $10, $10,
      to_tsvector('simple', coalesce($1, '') || ' ' || coalesce($2, ''))
    ) RETURNING id`,
    [
      input.title,
      input.description,
      input.subjectId,
      input.difficulty,
      input.visibility,
      input.isChallenge,
      input.estimatedTimeSeconds,
      input.createdBy,
      input.createdAt,
      input.updatedAt,
    ],
  );
  return { id: res.rows[0].id };
}

async function insertChallenge(client, input) {
  await client.query(
    `INSERT INTO challenge_settings (quiz_id, start_at, end_at, time_limit_seconds, rules)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (quiz_id) DO NOTHING`,
    [input.quizId, input.startAt, input.endAt, input.timeLimitSeconds, {}],
  );
}

async function insertQuizQuestions(client, quizId, questionIds) {
  if (!questionIds.length) return;
  const values = [];
  const params = [];
  let idx = 1;
  questionIds.forEach((questionId, position) => {
    params.push(`($${idx}, $${idx + 1}, $${idx + 2}, $${idx + 3}, $${idx + 4})`);
    values.push(quizId, questionId, position + 1, null, true);
    idx += 5;
  });
  await client.query(
    `INSERT INTO quiz_questions (quiz_id, question_id, position, score, required)
     VALUES ${params.join(", ")}
     ON CONFLICT (quiz_id, question_id) DO NOTHING`,
    values,
  );
}

async function insertAttempts(client, input) {
  for (const user of input.users) {
    const startedAt = shiftDate(input.updatedAt, -randomInt(1, 14));
    const submittedAt = shiftDate(startedAt, randomInt(0, 2));
    const correct = randomInt(0, input.totalQuestions);
    const percent = Math.round((correct / input.totalQuestions) * 100);
    const xp = randomInt(10, 80);

    await client.query(
      `INSERT INTO attempts (
        user_id, quiz_id, status, started_at, submitted_at,
        time_limit_seconds, remaining_seconds,
        score_raw, score_percent, correct_count, total_questions, xp_earned
      ) VALUES (
        $1, $2, 'submitted', $3, $4,
        $5, 0,
        $6, $7, $8, $9, $10
      )`,
      [
        user.id,
        input.quizId,
        startedAt,
        submittedAt,
        input.estimatedTimeSeconds,
        correct,
        percent,
        correct,
        input.totalQuestions,
        xp,
      ],
    );

    await client.query(
      `INSERT INTO xp_events (user_id, source, amount, metadata)
       VALUES ($1, 'attempt', $2, $3)`,
      [user.id, xp, { quizId: input.quizId }],
    );
  }
}

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sample(list, count) {
  const copy = [...list];
  shuffle(copy);
  return copy.slice(0, Math.min(count, copy.length));
}

function shuffle(list) {
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
}

function randomTimestamps(daysBack) {
  const now = new Date();
  const updatedAt = new Date(
    now.getTime() - randomInt(0, daysBack) * 24 * 60 * 60 * 1000,
  );
  const createdAt = new Date(updatedAt.getTime() - randomInt(0, 10) * 86400000);
  return {
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
  };
}

function shiftDate(isoString, days) {
  const date = new Date(isoString);
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

main();
