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
  multiSubjectRate: Number(args.multiSubjectRate ?? 0.35),
};

const subjectSeeds = [
  { name: "Tiếng Việt", slug: "vi" },
  { name: "Tiếng Anh", slug: "en" },
  { name: "Tư duy Khoa học", slug: "sci" },
  { name: "Toán học", slug: "math" },
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

const difficultyLevels = ["easy", "medium", "hard"];
const quizVisibility = ["free", "premium"];

async function main() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    await client.query("BEGIN");
    console.log("Seeding database with config:", config);

    const passwordHash = bcrypt.hashSync("Password123!", 10);
    const staff = await upsertStaff(client, passwordHash);

    const studentInputs = [];
    for (let i = 0; i < config.students; i += 1) {
      const fullName = `${pick(peopleLast)} ${pick(peopleFirst)}`;
      studentInputs.push({
        email: `student.${i + 1}@baihoc.dev`,
        fullName,
        role: "student",
        tier: Math.random() < 0.2 ? "paid" : "free",
        status: "active",
        passwordHash,
      });
    }
    await insertUsers(client, studentInputs);
    const students = await fetchUsersByEmail(
      client,
      studentInputs.map((s) => s.email),
    );

    const subjects = await upsertSubjects(client, subjectSeeds);
    const questionRows = [];
    const questionBank = new Map();
    subjects.forEach((subject) => {
      const questionIds = [];
      for (let i = 0; i < config.questionsPerSubject; i += 1) {
        const id = crypto.randomUUID();
        const difficulty = pick(difficultyLevels);
        const stem = `Câu hỏi ${i + 1} về ${subject.name}`;
        const explanation = `Giải thích cho câu hỏi ${i + 1} (${subject.name}).`;
        questionRows.push([
          id,
          subject.id,
          difficulty,
          "mcq_single",
          stem,
          explanation,
          "active",
          [subject.slug],
          1,
          staff.id,
        ]);
        questionIds.push(id);
      }
      questionBank.set(subject.id, questionIds);
    });

    await insertRows(
      client,
      "questions",
      [
        "id",
        "subject_id",
        "default_difficulty",
        "type",
        "stem",
        "explanation",
        "status",
        "tags",
        "default_score",
        "created_by",
      ],
      questionRows,
    );

    const quizRows = [];
    const quizQuestionRows = [];
    const attemptRows = [];
    const xpRows = [];
    const challengeRows = [];

    for (let i = 0; i < config.quizzes; i += 1) {
      const quizId = crypto.randomUUID();
      const chosenSubjects = pickSubjects(
        subjects,
        config.multiSubjectRate,
      );
      const primarySubject = pick(chosenSubjects);
      const difficulty = pick(difficultyLevels);
      const visibility = pick(quizVisibility);
      const isChallenge = Math.random() < 0.2;
      const title = `${primarySubject.name} ${pick(quizNameParts)} #${i + 1}`;
      const description = `Bộ câu hỏi ${title.toLowerCase()} dành cho luyện tập.`;
      const minutes = randomInt(10, 50);
      const timestamps = randomTimestamps(120);

      quizRows.push([
        quizId,
        title,
        description,
        primarySubject.id,
        difficulty,
        visibility,
        "published",
        isChallenge,
        minutes * 60,
        0,
        0,
        staff.id,
        timestamps.createdAt,
        timestamps.updatedAt,
        timestamps.updatedAt,
      ]);

      if (isChallenge) {
        challengeRows.push([
          quizId,
          shiftDate(timestamps.updatedAt, -1),
          shiftDate(timestamps.updatedAt, 7),
          minutes * 60,
          {},
        ]);
      }

      const questionTotal = randomInt(8, 30);
      const distribution = distribute(questionTotal, chosenSubjects.length);
      let position = 1;
      chosenSubjects.forEach((subject, index) => {
        const questionIds = questionBank.get(subject.id) ?? [];
        const count = Math.min(distribution[index], questionIds.length);
        const selectedQuestions = sample(questionIds, count);
        selectedQuestions.forEach((questionId) => {
          quizQuestionRows.push([quizId, questionId, position, null, true]);
          position += 1;
        });
      });

      const questionCount = Math.max(position - 1, 0);
      const attemptCount = randomInt(0, config.maxAttemptsPerQuiz);
      const attemptUsers = sample(students, attemptCount);
      attemptUsers.forEach((user) => {
        const startedAt = shiftDate(timestamps.updatedAt, -randomInt(1, 14));
        const submittedAt = shiftDate(startedAt, randomInt(0, 2));
        const correct = randomInt(0, questionCount || 1);
        const percent = Math.round((correct / (questionCount || 1)) * 100);
        const xp = randomInt(10, 80);
        attemptRows.push([
          user.id,
          quizId,
          "submitted",
          startedAt,
          submittedAt,
          minutes * 60,
          0,
          correct,
          percent,
          correct,
          questionCount || 1,
          xp,
          submittedAt,
        ]);
        xpRows.push([user.id, "attempt", xp, { quizId }, submittedAt]);
      });
    }

    await insertRows(
      client,
      "quizzes",
      [
        "id",
        "title",
        "description",
        "subject_id",
        "difficulty",
        "visibility",
        "status",
        "is_challenge",
        "estimated_time_seconds",
        "rating_count",
        "rating_avg",
        "created_by",
        "created_at",
        "updated_at",
        "published_at",
      ],
      quizRows,
    );

    if (challengeRows.length) {
      await insertRows(
        client,
        "challenge_settings",
        ["quiz_id", "start_at", "end_at", "time_limit_seconds", "rules"],
        challengeRows,
        "ON CONFLICT (quiz_id) DO NOTHING",
      );
    }

    await insertRows(
      client,
      "quiz_questions",
      ["quiz_id", "question_id", "position", "score", "required"],
      quizQuestionRows,
      "ON CONFLICT (quiz_id, question_id) DO NOTHING",
    );

    if (attemptRows.length) {
      await insertRows(
        client,
        "attempts",
        [
          "user_id",
          "quiz_id",
          "status",
          "started_at",
          "submitted_at",
          "time_limit_seconds",
          "remaining_seconds",
          "score_raw",
          "score_percent",
          "correct_count",
          "total_questions",
          "xp_earned",
          "created_at",
        ],
        attemptRows,
      );
    }

    if (xpRows.length) {
      await insertRows(
        client,
        "xp_events",
        ["user_id", "source", "amount", "metadata", "created_at"],
        xpRows,
      );
    }

    await client.query("COMMIT");

    console.log(
      `Seed complete: ${subjects.length} subjects, ${students.length} students, ${config.quizzes} quizzes.`,
    );
    console.log("Login creds: staff@baihoc.dev / Password123!");
    console.log("Sample student: student.1@baihoc.dev / Password123!");
  } catch (error) {
    await client.query("ROLLBACK");
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

async function upsertStaff(client, passwordHash) {
  const res = await client.query(
    `INSERT INTO users (
      email, password_hash, full_name, role, tier, status,
      email_verified_at, profile_completed
    ) VALUES (
      $1, $2, $3,
      'staff'::user_role,
      'paid'::user_tier,
      'active'::user_status,
      now(),
      true
    )
    ON CONFLICT (email) DO UPDATE
      SET role = 'staff',
          tier = 'paid',
          status = 'active',
          full_name = EXCLUDED.full_name,
          email_verified_at = COALESCE(users.email_verified_at, now()),
          profile_completed = true
    RETURNING id, email, full_name`,
    ["staff@baihoc.dev", passwordHash, "BaiHoc Staff"],
  );
  return res.rows[0];
}

async function insertUsers(client, users) {
  if (!users.length) return;
  const columns = [
    "email",
    "password_hash",
    "full_name",
    "role",
    "tier",
    "status",
    "email_verified_at",
    "profile_completed",
  ];
  const rows = users.map((user) => [
    user.email,
    user.passwordHash,
    user.fullName,
    user.role,
    user.tier,
    user.status,
    new Date().toISOString(),
    true,
  ]);
  await insertRows(
    client,
    "users",
    columns,
    rows,
    "ON CONFLICT (email) DO NOTHING",
  );
}

async function fetchUsersByEmail(client, emails) {
  if (!emails.length) return [];
  const res = await client.query(
    `SELECT id, email, full_name FROM users WHERE email = ANY($1)`,
    [emails],
  );
  return res.rows;
}

async function upsertSubjects(client, seeds) {
  const values = [];
  const placeholders = seeds.map((seed, index) => {
    values.push(seed.name, seed.slug);
    const base = index * 2;
    return `($${base + 1}, $${base + 2})`;
  });
  const res = await client.query(
    `INSERT INTO subjects (name, slug)
     VALUES ${placeholders.join(", ")}
     ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
     RETURNING id, name, slug`,
    values,
  );
  return res.rows;
}

async function insertRows(client, table, columns, rows, conflictClause = "") {
  if (!rows.length) return;
  const batchSize = 500;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const values = [];
    const placeholders = batch.map((row, rowIndex) => {
      const base = rowIndex * columns.length;
      row.forEach((value) => values.push(value));
      const params = row.map((_, colIndex) => `$${base + colIndex + 1}`);
      return `(${params.join(", ")})`;
    });
    const sql = `INSERT INTO ${table} (${columns.join(", ")}) VALUES ${
      placeholders.join(", ")
    } ${conflictClause}`;
    await client.query(sql, values);
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

function pickSubjects(subjects, rate) {
  if (Math.random() > rate) return [pick(subjects)];
  const total = randomInt(2, Math.min(3, subjects.length));
  return sample(subjects, total);
}

function distribute(total, buckets) {
  const base = Array.from({ length: buckets }, () => 1);
  let remaining = Math.max(total - buckets, 0);
  while (remaining > 0) {
    const idx = randomInt(0, buckets - 1);
    base[idx] += 1;
    remaining -= 1;
  }
  return base;
}

main();
