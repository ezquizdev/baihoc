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

const difficultyLevels = [1, 2, 3, 4, 5];
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
    const { topicsBySubject } = await seedTopics(client, subjects);

    const questionRows = [];
    const questionTopicRows = [];
    const questionOptionRows = [];
    const shortAnswerKeyRows = [];
    const passageRows = [];
    const questionPassageRows = [];
    const questionGroups = new Map();
    const questionIdsByType = {
      mcq_single: [],
      mcq_multi: [],
      short_answer: [],
    };

    subjects.forEach((subject) => {
      const groups = [];
      const subjectTopicIds = topicsBySubject.get(subject.id) ?? [];
      const passageGroupCount = Math.max(
        1,
        Math.round(config.questionsPerSubject / 12),
      );
      let generated = 0;

      for (let g = 0; g < passageGroupCount; g += 1) {
        const passageId = crypto.randomUUID();
        const groupSize = randomInt(2, 4);
        const groupQuestionIds = [];
        const groupTypes =
          groupSize >= 3
            ? ["mcq_single", "mcq_multi", "short_answer"]
            : ["mcq_single", "mcq_multi"];
        passageRows.push([
          passageId,
          buildPassageContent({
            subjectName: subject.name,
            subjectSlug: subject.slug,
            groupIndex: g,
            groupSize,
            startPosition: generated + 1,
          }),
          [],
        ]);
        for (let j = 0; j < groupSize; j += 1) {
          const id = crypto.randomUUID();
          const difficulty = pick(difficultyLevels);
          const type = groupTypes[j] ?? pick(Object.keys(questionIdsByType));
          const stem = buildQuestionStem({
            subjectName: subject.name,
            subjectSlug: subject.slug,
            index: generated + j + 1,
            type,
            passage: true,
          });
          const explanation = `Giải thích cho câu hỏi ${generated + j + 1} (${subject.name}).`;
          questionRows.push([
            id,
            subject.id,
            difficulty,
            type,
            stem,
            explanation,
            "active",
            [subject.slug],
            1,
            staff.id,
          ]);
          questionIdsByType[type].push(id);
          seedQuestionMeta({
            questionOptionRows,
            shortAnswerKeyRows,
            questionId: id,
            type,
            subject,
            index: generated + j + 1,
            passage: true,
          });
          assignQuestionTopics(questionTopicRows, id, subjectTopicIds);
          questionPassageRows.push([id, passageId, j + 1]);
          groupQuestionIds.push(id);
        }
        groups.push(groupQuestionIds);
        generated += groupSize;
      }

      const standaloneTypeSequence = [
        "mcq_single",
        "mcq_single",
        "mcq_multi",
        "mcq_single",
        "short_answer",
      ];
      for (let i = generated; i < config.questionsPerSubject; i += 1) {
        const id = crypto.randomUUID();
        const difficulty = pick(difficultyLevels);
        const type =
          standaloneTypeSequence[
            (i - generated) % standaloneTypeSequence.length
          ];
        const stem = buildQuestionStem({
          subjectName: subject.name,
          subjectSlug: subject.slug,
          index: i + 1,
          type,
          passage: false,
        });
        const explanation = `Giải thích cho câu hỏi ${i + 1} (${subject.name}).`;
        questionRows.push([
          id,
          subject.id,
          difficulty,
          type,
          stem,
          explanation,
          "active",
          [subject.slug],
          1,
          staff.id,
        ]);
        questionIdsByType[type].push(id);
        seedQuestionMeta({
          questionOptionRows,
          shortAnswerKeyRows,
          questionId: id,
          type,
          subject,
          index: i + 1,
          passage: false,
        });
        assignQuestionTopics(questionTopicRows, id, subjectTopicIds);
        groups.push([id]);
      }

      questionGroups.set(subject.id, groups);
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
    if (questionOptionRows.length) {
      await insertRows(
        client,
        "question_options",
        ["question_id", "label", "text", "is_correct", "position"],
        questionOptionRows,
      );
    }
    if (shortAnswerKeyRows.length) {
      await insertRows(
        client,
        "short_answer_keys",
        ["question_id", "acceptable_answer", "case_sensitive"],
        shortAnswerKeyRows,
      );
    }
    if (passageRows.length) {
      await insertRows(
        client,
        "passages",
        ["id", "content", "media_urls"],
        passageRows,
      );
    }
    if (questionPassageRows.length) {
      await insertRows(
        client,
        "question_passages",
        ["question_id", "passage_id", "position"],
        questionPassageRows,
      );
    }
    if (questionTopicRows.length) {
      await insertRows(
        client,
        "question_topics",
        ["question_id", "topic_id"],
        questionTopicRows,
        "ON CONFLICT DO NOTHING",
      );
    }

    const quizRows = [];
    const quizQuestionRows = [];
    const attemptRows = [];
    const xpRows = [];
    const challengeRows = [];

    for (let i = 0; i < config.quizzes; i += 1) {
      const quizId = crypto.randomUUID();
      const isDemoQuiz = i === 0;
      const isDemoChallenge = i === 1;
      const isDemoDraft = i === 2;
      const chosenSubjects =
        isDemoQuiz || isDemoChallenge
          ? subjects
          : pickSubjects(subjects, config.multiSubjectRate);
      const primarySubject = pick(chosenSubjects);
      const difficulty =
        isDemoQuiz || isDemoChallenge ? 2 : pick(difficultyLevels);
      const visibility =
        isDemoQuiz || isDemoChallenge ? "free" : pick(quizVisibility);
      const isDraft = isDemoDraft;
      const isChallenge = isDraft
        ? false
        : isDemoChallenge
          ? true
          : isDemoQuiz
            ? false
            : Math.random() < 0.2;
      const status = isDraft ? "draft" : "published";
      const title = isDemoQuiz
        ? "Demo: Tất cả dạng câu hỏi"
        : isDemoChallenge
          ? "Demo Challenge: Làm thử thách"
          : isDemoDraft
            ? `Draft: ${primarySubject.name} ${pick(quizNameParts)} #${i + 1}`
            : `${primarySubject.name} ${pick(quizNameParts)} #${i + 1}`;
      const description = isDemoQuiz
        ? "Quiz mẫu để kiểm tra đủ dạng câu hỏi (MCQ 1 đáp án, nhiều đáp án, và tự luận ngắn) + đoạn văn."
        : isDemoChallenge
          ? "Thử thách mẫu (đang diễn ra) để kiểm tra flow bắt đầu challenge, làm bài, và nộp bài."
          : isDemoDraft
            ? `Quiz nháp (draft) để kiểm tra flow quản trị: chỉnh sửa, lưu nháp và thêm câu hỏi.`
            : `Bộ câu hỏi ${title.toLowerCase()} dành cho luyện tập.`;
      const minutes = isDemoQuiz
        ? 20
        : isDemoChallenge
          ? 15
          : randomInt(10, 50);
      const nowIso = new Date().toISOString();
      const timestamps =
        isDemoQuiz || isDemoChallenge
          ? { createdAt: nowIso, updatedAt: nowIso }
          : randomTimestamps(120);
      const publishedAt = status === "published" ? timestamps.updatedAt : null;

      quizRows.push([
        quizId,
        title,
        description,
        difficulty,
        visibility,
        status,
        isChallenge,
        minutes * 60,
        null,
        staff.id,
        timestamps.createdAt,
        timestamps.updatedAt,
        publishedAt,
      ]);

      if (isChallenge) {
        const anchorIso = nowIso;
        challengeRows.push([
          quizId,
          shiftDate(anchorIso, -1),
          shiftDate(anchorIso, 7),
        ]);
      }

      let position = 1;
      if (isDemoQuiz || isDemoChallenge) {
        const demoQuestionIds = buildDemoQuestionList({
          chosenSubjects,
          questionGroups,
          questionIdsByType,
        });
        demoQuestionIds.forEach((questionId) => {
          quizQuestionRows.push([quizId, questionId, position, null, true]);
          position += 1;
        });
      } else {
        const questionTotal = randomInt(8, 30);
        const distribution = distribute(questionTotal, chosenSubjects.length);
        chosenSubjects.forEach((subject, index) => {
          const groups = questionGroups.get(subject.id) ?? [];
          const selectedGroups = pickQuestionGroups(
            groups,
            distribution[index],
          );
          selectedGroups.forEach((group) => {
            group.forEach((questionId) => {
              quizQuestionRows.push([quizId, questionId, position, null, true]);
              position += 1;
            });
          });
        });
      }

      const questionCount = Math.max(position - 1, 0);
      const attemptCount = isDemoChallenge
        ? 0
        : isDraft
          ? 0
          : randomInt(0, config.maxAttemptsPerQuiz);
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
          isChallenge ? quizId : null,
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
        "difficulty_level",
        "visibility",
        "status",
        "is_challenge",
        "estimated_time_seconds",
        "featured_rank",
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
        ["quiz_id", "start_at", "end_at"],
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
          "challenge_id",
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

async function seedTopics(client, subjects) {
  const topicRows = [];
  subjects.forEach((subject) => {
    for (let i = 0; i < 3; i += 1) {
      topicRows.push([
        subject.id,
        `${subject.name} Chủ đề ${i + 1}`,
        `${subject.slug}-topic-${i + 1}`,
      ]);
    }
  });

  await insertRows(
    client,
    "topics",
    ["subject_id", "name", "slug"],
    topicRows,
    "ON CONFLICT (subject_id, slug) DO UPDATE SET name = EXCLUDED.name",
  );

  const res = await client.query(
    `SELECT id, subject_id FROM topics WHERE subject_id = ANY($1::uuid[])`,
    [subjects.map((subject) => subject.id)],
  );
  const topicsBySubject = new Map();
  res.rows.forEach((row) => {
    if (!topicsBySubject.has(row.subject_id)) {
      topicsBySubject.set(row.subject_id, []);
    }
    topicsBySubject.get(row.subject_id).push(row.id);
  });
  return { topicsBySubject };
}

async function insertRows(client, table, columns, rows, conflictClause = "") {
  if (!rows.length) return;
  const batchSize = 500;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const values = [];
    const placeholders = batch.map((row, rowIndex) => {
      const base = rowIndex * columns.length;
      row.forEach((value) => {
        values.push(value);
      });
      const params = row.map((_, colIndex) => `$${base + colIndex + 1}`);
      return `(${params.join(", ")})`;
    });
    const sql = `INSERT INTO ${table} (${columns.join(", ")}) VALUES ${placeholders.join(
      ", ",
    )} ${conflictClause}`;
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

function assignQuestionTopics(rows, questionId, topicIds) {
  if (!topicIds.length) return;
  const count = Math.random() < 0.3 ? 2 : 1;
  const selected = sample(topicIds, count);
  selected.forEach((topicId) => {
    rows.push([questionId, topicId]);
  });
}

function pickQuestionGroups(groups, targetCount) {
  const shuffled = [...groups];
  shuffle(shuffled);
  const selected = [];
  let count = 0;
  for (const group of shuffled) {
    if (count >= targetCount) break;
    selected.push(group);
    count += group.length;
  }
  return selected;
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

function buildPassageContent({
  subjectName,
  subjectSlug,
  groupIndex,
  groupSize: _groupSize,
  startPosition: _startPosition,
}) {
  const bodyParts = [
    `Chủ đề: **${subjectName}** (${subjectSlug.toUpperCase()})`,
    `Đây là đoạn thông tin mẫu #${groupIndex + 1} được seed để kiểm tra UI hiển thị phần "thông tin chung" (Markdown + LaTeX).`,
    "Bạn có thể cuộn, chuyển câu, và kiểm tra việc giữ nguyên đoạn văn khi đổi câu trong cùng nhóm.",
  ];

  if (groupIndex === 0) {
    bodyParts.push(
      `**Ghi chú định dạng:** _in nghiêng_, **in đậm**, danh sách gạch đầu dòng, và công thức $a^2 + b^2 = c^2$.`,
    );
    bodyParts.push(["- Dòng 1: *markdown*", "- Dòng 2: $x^2 + 1$"].join("\n"));
  }

  return bodyParts.join("\n\n");
}

function buildQuestionStem({
  subjectName,
  subjectSlug,
  index,
  type,
  passage: _passage,
}) {
  const prefix = `Câu hỏi ${index}`;
  const typeHint =
    type === "mcq_multi"
      ? "Chọn nhiều đáp án đúng."
      : type === "short_answer"
        ? "Nhập đáp án ngắn."
        : "Chọn 1 đáp án đúng.";

  const extras = ["**Gợi ý:** _đọc kỹ đề_ và trả lời ngắn gọn."];
  if (index % 2 === 0) {
    extras.push(`Ví dụ inline: $x^2 + ${index}x + 1$`);
  }
  if (index % 3 === 0) {
    extras.push(
      "Ví dụ block:\n\n$$\\frac{1}{2} + \\frac{1}{3} = \\frac{5}{6}$$",
    );
  }
  extras.push(`\`code\`: ${subjectSlug.toUpperCase()}-${index}`);

  return `${prefix} về ${subjectName}.\n\n${typeHint}\n\n${extras.join(
    "\n\n",
  )}\n\n[Mã chủ đề: ${subjectSlug.toUpperCase()}-${index}]`;
}

function seedQuestionMeta({
  questionOptionRows,
  shortAnswerKeyRows,
  questionId,
  type,
  subject,
  index,
  passage,
}) {
  if (type === "short_answer") {
    const base = `${subject.slug}-${index}`;
    const caseSensitive = passage && Math.random() < 0.5;
    const answer = caseSensitive ? base.toUpperCase() : base;
    shortAnswerKeyRows.push([questionId, answer, caseSensitive]);
    return;
  }

  const labels = ["A", "B", "C", "D"];
  const optionTexts = labels.map((label) => {
    const base = `${subject.name} • ${
      passage ? "Theo thông tin chung" : "Cơ bản"
    } • ${label} (${subject.slug.toUpperCase()}-${index})`;
    if (index % 2 === 0 && label === "A") {
      return `**${base}**\n\nInline: $\\sqrt{${index}}$`;
    }
    if (index % 2 === 0 && label === "B") {
      return `${base}\n\n_ghi chú_: dùng **markdown**`;
    }
    if (index % 3 === 0 && label === "C") {
      return `${base}\n\n$$x^2 + 2x + 1 = (x+1)^2$$`;
    }
    if (index % 5 === 0 && label === "D") {
      return `${base}\n\n\`code\`: ${subject.slug}-${index}`;
    }
    return base;
  });
  const positions = [1, 2, 3, 4];
  const correctPositions =
    type === "mcq_multi"
      ? sample(positions, randomInt(2, 3))
      : [pick(positions)];

  labels.forEach((label, idx) => {
    const position = idx + 1;
    questionOptionRows.push([
      questionId,
      label,
      optionTexts[idx],
      correctPositions.includes(position),
      position,
    ]);
  });
}

function buildDemoQuestionList({
  chosenSubjects,
  questionGroups,
  questionIdsByType,
}) {
  const seen = new Set();
  const ordered = [];

  for (const subject of chosenSubjects) {
    const groups = questionGroups.get(subject.id) ?? [];
    const passageGroup = groups.find((group) => group.length >= 2);
    if (!passageGroup) continue;
    for (const id of passageGroup) {
      if (seen.has(id)) continue;
      ordered.push(id);
      seen.add(id);
    }
    break;
  }

  const ensureType = (type) => {
    const candidates = questionIdsByType[type] ?? [];
    const pickId = candidates.find((id) => !seen.has(id));
    if (!pickId) return;
    ordered.push(pickId);
    seen.add(pickId);
  };

  ensureType("mcq_single");
  ensureType("mcq_multi");
  ensureType("short_answer");

  return ordered;
}

main();
