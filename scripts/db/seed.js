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
const totalStudents = Number(args.students ?? 32);
const defaultPaidStudents = Math.max(1, Math.round(totalStudents * 0.25));
const config = {
  students: totalStudents,
  paidStudents: Number(args.paidStudents ?? args.paid ?? defaultPaidStudents),
  quizzes: Math.max(2, Number(args.quizzes ?? 36)),
  questionsPerSubject: Number(args.questions ?? 48),
  maxAttemptsPerQuiz: Number(args.maxAttempts ?? 18),
  multiSubjectRate: Number(args.multiSubjectRate ?? 0.35),
  allowlistEntries: Number(args.allowlist ?? 8),
  customQuizzes: Number(args.customQuizzes ?? 3),
};

const DEMO_1_CHALLENGE_QUIZ_ID = "00000000-0000-0000-0000-00000000d001";
const DEMO_1_QUESTION_IDS = [
  "00000000-0000-0000-0000-00000000d101",
  "00000000-0000-0000-0000-00000000d102",
  "00000000-0000-0000-0000-00000000d103",
  "00000000-0000-0000-0000-00000000d104",
  "00000000-0000-0000-0000-00000000d105",
  "00000000-0000-0000-0000-00000000d106",
  "00000000-0000-0000-0000-00000000d107",
  "00000000-0000-0000-0000-00000000d108",
  "00000000-0000-0000-0000-00000000d109",
  "00000000-0000-0000-0000-00000000d10a",
];

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
    console.log(
      `Students: total=${config.students} free=${Math.max(0, config.students - Math.max(0, Math.min(config.paidStudents, config.students)))} paid=${Math.max(0, Math.min(config.paidStudents, config.students))}`,
    );

    const passwordHash = bcrypt.hashSync("Password123!", 10);
    const staff = await upsertStaff(client, passwordHash);

    const studentInputs = [];
    const paidStudentCount = Math.max(
      0,
      Math.min(config.paidStudents, config.students),
    );
    const freeStudentCount = Math.max(0, config.students - paidStudentCount);

    for (let i = 0; i < freeStudentCount; i += 1) {
      const fullName = `${pick(peopleLast)} ${pick(peopleFirst)}`;
      studentInputs.push({
        email: `student.${i + 1}@baihoc.dev`,
        fullName,
        role: "student",
        tier: "free",
        status: "active",
        passwordHash,
      });
    }
    for (let i = 0; i < paidStudentCount; i += 1) {
      const fullName = `${pick(peopleLast)} ${pick(peopleFirst)}`;
      studentInputs.push({
        email: `paid.${i + 1}@baihoc.dev`,
        fullName,
        role: "student",
        tier: "paid",
        status: "active",
        passwordHash,
      });
    }
    await insertUsers(client, studentInputs);
    const students = await fetchUsersByEmail(
      client,
      studentInputs.map((s) => s.email),
    );
    const studentByEmail = new Map(students.map((s) => [s.email, s]));
    const samplePaidStudent =
      studentByEmail.get("paid.1@baihoc.dev") ??
      students.find((s) => s.email.startsWith("paid.")) ??
      students[0];
    const sampleFreeStudent =
      studentByEmail.get("student.1@baihoc.dev") ??
      students.find((s) => s.email.startsWith("student.")) ??
      students[1];
    const sampleResumeStudent =
      studentByEmail.get("student.2@baihoc.dev") ??
      studentByEmail.get("student.3@baihoc.dev") ??
      students[2];
    const sampleAdminHistoryStudent =
      studentByEmail.get("paid.2@baihoc.dev") ?? samplePaidStudent;

    const allowlistEmails = await seedAllowlist(client, {
      addedBy: staff.id,
      count: config.allowlistEntries,
    });
    const verificationExample = await seedPendingVerificationExampleUser(
      client,
      {
        passwordHash,
      },
    );
    if (sampleAdminHistoryStudent?.id) {
      await seedUserAdminHistory(client, {
        staffUserId: staff.id,
        userId: sampleAdminHistoryStudent.id,
      });
    }

    const subjects = await upsertSubjects(client, subjectSeeds);
    const { topicsBySubject, topicIdBySlug } = await seedTopics(
      client,
      subjects,
    );
    const subjectBySlug = new Map(
      subjects.map((subject) => [subject.slug, subject]),
    );

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

    const demoSeed = seedDemo1Questions({
      questionRows,
      questionOptionRows,
      questionTopicRows,
      passageRows,
      questionPassageRows,
      subjectBySlug,
      topicIdBySlug,
      staffUserId: staff.id,
    });

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
      "ON CONFLICT (id) DO UPDATE SET subject_id = EXCLUDED.subject_id, default_difficulty = EXCLUDED.default_difficulty, type = EXCLUDED.type, stem = EXCLUDED.stem, explanation = EXCLUDED.explanation, status = EXCLUDED.status, tags = EXCLUDED.tags, default_score = EXCLUDED.default_score, created_by = EXCLUDED.created_by, updated_at = now()",
    );
    if (questionOptionRows.length) {
      await insertRows(
        client,
        "question_options",
        ["question_id", "label", "text", "is_correct", "position"],
        questionOptionRows,
        "ON CONFLICT (question_id, position) DO UPDATE SET label = EXCLUDED.label, text = EXCLUDED.text, is_correct = EXCLUDED.is_correct",
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
      await insertRows(client, "passages", ["id", "content"], passageRows);
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

    await refreshSearchVectors(client, { questions: true });

    const quizRows = [];
    const quizQuestionRows = [];
    const challengeRows = [];
    const attemptPlans = [];
    const attemptPlanKeys = new Set();
    const quizMetaById = new Map();
    let demoQuizId = null;
    let demoChallengeId = null;

    const demoSubjectIds = new Set(demoSeed.demoQuestionGroupsBySubject.keys());
    const quizSubjects = subjects.filter((subject) =>
      demoSubjectIds.has(subject.id),
    );
    const baseQuizSubjects = quizSubjects.length ? quizSubjects : subjects;

    for (let i = 0; i < config.quizzes; i += 1) {
      const isDemoChallenge = i === 0;
      const isDemoQuiz = i === 1;
      const isDemoDraft = i === 2;
      const quizId = isDemoChallenge
        ? DEMO_1_CHALLENGE_QUIZ_ID
        : crypto.randomUUID();
      const chosenSubjects =
        isDemoQuiz || isDemoChallenge
          ? baseQuizSubjects
          : pickSubjects(baseQuizSubjects, config.multiSubjectRate);
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
        ? "Demo #1 (15s)"
        : isDemoChallenge
          ? "Demo #1"
          : isDemoDraft
            ? `Draft: ${primarySubject.name} ${pick(quizNameParts)} #${i + 1}`
            : `${primarySubject.name} ${pick(quizNameParts)} #${i + 1}`;
      const description = isDemoQuiz
        ? "Bản sao của challenge demo #1 với thời gian 15 giây để kiểm tra flow tính giờ."
        : isDemoChallenge
          ? "Challenge demo #1 (đang diễn ra) để luyện tập nhanh theo từng môn."
          : isDemoDraft
            ? `Quiz nháp (draft) để kiểm tra flow quản trị: chỉnh sửa, lưu nháp và thêm câu hỏi.`
            : `Bộ câu hỏi ${title.toLowerCase()} dành cho luyện tập.`;
      const timeLimitSeconds = isDemoQuiz
        ? 15
        : isDemoChallenge
          ? 15 * 60
          : randomInt(10, 50) * 60;
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
        timeLimitSeconds,
        null,
        staff.id,
        timestamps.createdAt,
        timestamps.updatedAt,
        publishedAt,
      ]);
      quizMetaById.set(quizId, {
        title,
        difficulty,
        estimatedTimeSeconds: timeLimitSeconds,
        isChallenge,
        status,
      });
      if (isDemoQuiz) demoQuizId = quizId;
      if (isDemoChallenge) demoChallengeId = quizId;

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
        demoSeed.demoChallengeQuestionIds.forEach((questionId) => {
          quizQuestionRows.push([quizId, questionId, position, null, true]);
          position += 1;
        });
      } else {
        const questionTotal = randomInt(8, 30);
        const distribution = distribute(questionTotal, chosenSubjects.length);
        chosenSubjects.forEach((subject, index) => {
          const groups =
            demoSeed.demoQuestionGroupsBySubject.get(subject.id) ?? [];
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
      const attemptCount = isDraft
        ? 0
        : isDemoQuiz || isDemoChallenge
          ? Math.min(10, students.length)
          : randomInt(0, config.maxAttemptsPerQuiz);

      const attemptUsers = sample(students, attemptCount);
      attemptUsers.forEach((user) => {
        const key = `${user.id}:${quizId}`;
        if (attemptPlanKeys.has(key)) return;
        attemptPlanKeys.add(key);

        const startedAt = shiftDate(timestamps.updatedAt, -randomInt(1, 14));
        const submittedAt = shiftDate(startedAt, randomInt(0, 2));
        const statusRoll = Math.random();
        const attemptStatus =
          statusRoll < 0.12 ? "auto_submitted" : "submitted";

        attemptPlans.push({
          attemptId: crypto.randomUUID(),
          userId: user.id,
          quizId,
          challengeId: isChallenge ? quizId : null,
          customQuizId: null,
          status: attemptStatus,
          startedAt,
          submittedAt,
          timeLimitSeconds,
          totalQuestions: questionCount || 1,
        });
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
      "ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, difficulty_level = EXCLUDED.difficulty_level, visibility = EXCLUDED.visibility, status = EXCLUDED.status, is_challenge = EXCLUDED.is_challenge, estimated_time_seconds = EXCLUDED.estimated_time_seconds, featured_rank = EXCLUDED.featured_rank, created_by = EXCLUDED.created_by, updated_at = EXCLUDED.updated_at, published_at = EXCLUDED.published_at",
    );

    if (challengeRows.length) {
      await insertRows(
        client,
        "challenge_settings",
        ["quiz_id", "start_at", "end_at"],
        challengeRows,
        "ON CONFLICT (quiz_id) DO UPDATE SET start_at = EXCLUDED.start_at, end_at = EXCLUDED.end_at",
      );
    }

    await client.query(`DELETE FROM quiz_questions WHERE quiz_id = $1`, [
      DEMO_1_CHALLENGE_QUIZ_ID,
    ]);

    await insertRows(
      client,
      "quiz_questions",
      ["quiz_id", "question_id", "position", "score", "required"],
      quizQuestionRows,
      "ON CONFLICT (quiz_id, question_id) DO UPDATE SET position = EXCLUDED.position, score = EXCLUDED.score, required = EXCLUDED.required",
    );

    await refreshSearchVectors(client, { quizzes: true });

    const customQuizSeeds = await seedCustomQuizzes(client, {
      count: config.customQuizzes,
      users: students,
      topicsBySubject,
      quizMetaById,
    });

    if (samplePaidStudent?.id && demoQuizId) {
      addAttemptPlan(attemptPlans, attemptPlanKeys, {
        attemptId: crypto.randomUUID(),
        userId: samplePaidStudent.id,
        quizId: demoQuizId,
        challengeId: null,
        customQuizId: null,
        status: "submitted",
        startedAt: shiftDate(new Date().toISOString(), -randomInt(2, 10)),
        submittedAt: shiftDate(new Date().toISOString(), -randomInt(0, 2)),
        timeLimitSeconds:
          quizMetaById.get(demoQuizId)?.estimatedTimeSeconds ?? 0,
        totalQuestions: quizQuestionRows.filter((row) => row[0] === demoQuizId)
          .length,
      });
    }

    if (samplePaidStudent?.id && demoChallengeId) {
      addAttemptPlan(attemptPlans, attemptPlanKeys, {
        attemptId: crypto.randomUUID(),
        userId: samplePaidStudent.id,
        quizId: demoChallengeId,
        challengeId: demoChallengeId,
        customQuizId: null,
        status: "submitted",
        startedAt: shiftDate(new Date().toISOString(), -randomInt(2, 10)),
        submittedAt: shiftDate(new Date().toISOString(), -randomInt(0, 2)),
        timeLimitSeconds:
          quizMetaById.get(demoChallengeId)?.estimatedTimeSeconds ?? 0,
        totalQuestions: quizQuestionRows.filter(
          (row) => row[0] === demoChallengeId,
        ).length,
      });
    }

    const firstCustom = customQuizSeeds[0] ?? null;
    if (samplePaidStudent?.id && firstCustom) {
      addAttemptPlan(attemptPlans, attemptPlanKeys, {
        attemptId: crypto.randomUUID(),
        userId: samplePaidStudent.id,
        quizId: firstCustom.quizId,
        challengeId: null,
        customQuizId: firstCustom.customQuizId,
        status: "submitted",
        startedAt: shiftDate(new Date().toISOString(), -randomInt(2, 10)),
        submittedAt: shiftDate(new Date().toISOString(), -randomInt(0, 2)),
        timeLimitSeconds:
          quizMetaById.get(firstCustom.quizId)?.estimatedTimeSeconds ?? null,
        totalQuestions: await countQuizQuestions(client, firstCustom.quizId),
      });
    }

    if (sampleResumeStudent?.id && demoQuizId) {
      addAttemptPlan(attemptPlans, attemptPlanKeys, {
        attemptId: crypto.randomUUID(),
        userId: sampleResumeStudent.id,
        quizId: demoQuizId,
        challengeId: null,
        customQuizId: null,
        status: "in_progress",
        startedAt: shiftDate(new Date().toISOString(), -1),
        submittedAt: null,
        timeLimitSeconds:
          quizMetaById.get(demoQuizId)?.estimatedTimeSeconds ?? 0,
        totalQuestions: quizQuestionRows.filter((row) => row[0] === demoQuizId)
          .length,
      });
    }

    const highlight = await seedHighlightChallenge(client, {
      staffUserId: staff.id,
      preferredChallengeQuizId: demoChallengeId,
      preferredQuestionId: demoSeed.highlightQuestionId ?? null,
    });

    if (highlight && sampleFreeStudent?.id) {
      await seedHighlightSubmission(client, {
        userId: sampleFreeStudent.id,
        quizId: highlight.quizId,
        questionId: highlight.questionId,
      });
    }

    const attemptSeedSummary = await seedAttempts(client, {
      plans: attemptPlans,
      quizMetaById,
    });

    await client.query("COMMIT");

    console.log(
      `Seed complete: ${subjects.length} subjects, ${students.length} students, ${config.quizzes} quizzes.`,
    );
    console.log("Login creds: staff@baihoc.dev / Password123!");
    console.log(
      "Student accounts: student.X@baihoc.dev = free, paid.X@baihoc.dev = paid",
    );
    if (samplePaidStudent?.email) {
      console.log(
        `Sample paid student: ${samplePaidStudent.email} / Password123!`,
      );
    }
    if (sampleFreeStudent?.email) {
      console.log(
        `Sample free student: ${sampleFreeStudent.email} / Password123!`,
      );
    }
    if (sampleResumeStudent?.email) {
      console.log(
        `Resume-flow student: ${sampleResumeStudent.email} / Password123!`,
      );
    }
    if (allowlistEmails.length) {
      console.log(
        `Allowlist seeded: ${allowlistEmails.length} emails (example: ${allowlistEmails[0]})`,
      );
    }
    if (verificationExample) {
      console.log(
        `Email verify example: ${verificationExample.email} (token: ${verificationExample.token})`,
      );
    }
    if (attemptSeedSummary) {
      console.log(
        `Attempts: ${attemptSeedSummary.attempts} attempts, ${attemptSeedSummary.answers} answers, ${attemptSeedSummary.xpEvents} XP events.`,
      );
    }
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
  const topicSlugSet = new Set();
  const subjectIdBySlug = new Map(
    subjects.map((subject) => [subject.slug, subject.id]),
  );

  const demoTopics = loadDemoTopicSeeds();
  demoTopics.forEach((topic) => {
    const subjectId = subjectIdBySlug.get(topic.subjectSlug);
    if (!subjectId) return;
    if (topicSlugSet.has(topic.topicSlug)) return;
    topicSlugSet.add(topic.topicSlug);
    topicRows.push([subjectId, topic.topicName, topic.topicSlug]);
  });

  subjects.forEach((subject) => {
    for (let i = 0; i < 3; i += 1) {
      const slug = `${subject.slug}-topic-${i + 1}`;
      if (topicSlugSet.has(slug)) continue;
      topicSlugSet.add(slug);
      topicRows.push([subject.id, `${subject.name} Chủ đề ${i + 1}`, slug]);
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
    `SELECT id, subject_id, slug FROM topics WHERE subject_id = ANY($1::uuid[])`,
    [subjects.map((subject) => subject.id)],
  );
  const topicsBySubject = new Map();
  const topicIdBySlug = new Map();
  res.rows.forEach((row) => {
    if (!topicsBySubject.has(row.subject_id)) {
      topicsBySubject.set(row.subject_id, []);
    }
    topicsBySubject.get(row.subject_id).push(row.id);
    if (row.slug) topicIdBySlug.set(row.slug, row.id);
  });
  return { topicsBySubject, topicIdBySlug };
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

async function refreshSearchVectors(
  client,
  options = { questions: false, quizzes: false },
) {
  if (options.questions) {
    await client.query(
      `UPDATE questions
       SET search_vector = to_tsvector('simple', coalesce(stem, '') || ' ' || coalesce(explanation, ''))
       WHERE search_vector IS NULL`,
    );
  }

  if (options.quizzes) {
    await client.query(
      `UPDATE quizzes
       SET search_vector = to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, ''))
       WHERE search_vector IS NULL`,
    );
  }
}

async function seedAllowlist(client, input) {
  const count = Number(input?.count ?? 0);
  if (!Number.isFinite(count) || count <= 0) return [];
  const addedBy = input?.addedBy ?? null;

  const emails = [];
  const allowlistRows = [];
  const auditRows = [];
  const nowIso = new Date().toISOString();

  for (let i = 0; i < count; i += 1) {
    const email = `allowlisted.${i + 1}@baihoc.dev`;
    emails.push(email);
    allowlistRows.push([email, "student", "paid", addedBy, nowIso]);
    auditRows.push([
      addedBy,
      "allowlist_add",
      "allowlist_email",
      null,
      { email, role: "student", tier: "paid" },
      nowIso,
    ]);
  }

  await insertRows(
    client,
    "course_student_allowlist",
    ["email", "role", "tier", "added_by", "created_at"],
    allowlistRows,
    "ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role, tier = EXCLUDED.tier, added_by = EXCLUDED.added_by",
  );

  await insertRows(
    client,
    "audit_logs",
    [
      "actor_user_id",
      "action",
      "target_type",
      "target_id",
      "metadata",
      "created_at",
    ],
    auditRows,
  );

  return emails;
}

async function seedPendingVerificationExampleUser(client, input) {
  const email = "pending.1@baihoc.dev";
  const passwordHash = input?.passwordHash ?? null;
  if (!passwordHash) return null;

  const userRes = await client.query(
    `INSERT INTO users (
       email,
       password_hash,
       full_name,
       role,
       tier,
       status,
       email_verified_at,
       profile_completed
     ) VALUES (
       $1,
       $2,
       $3,
       'student'::user_role,
       'free'::user_tier,
       'pending_verification'::user_status,
       NULL,
       true
     )
     ON CONFLICT (email) DO UPDATE
       SET password_hash = EXCLUDED.password_hash,
           full_name = EXCLUDED.full_name,
           role = 'student'::user_role,
           tier = 'free'::user_tier,
           status = 'pending_verification'::user_status,
           email_verified_at = NULL,
           profile_completed = true
     RETURNING id`,
    [email, passwordHash, "Pending Verification Student"],
  );
  const userId = userRes.rows[0]?.id ?? null;
  if (!userId) return null;

  const token = crypto.randomBytes(24).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const expiresAt = shiftDate(new Date().toISOString(), 3);

  await client.query(
    `INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)
     ON CONFLICT (token_hash) DO NOTHING`,
    [userId, tokenHash, expiresAt],
  );

  return { email, token };
}

async function seedUserAdminHistory(client, input) {
  const staffUserId = input?.staffUserId ?? null;
  const userId = input?.userId ?? null;
  if (!staffUserId || !userId) return;

  const res = await client.query(
    `SELECT tier, status FROM users WHERE id = $1`,
    [userId],
  );
  const row = res.rows[0];
  if (!row) return;

  const nowIso = new Date().toISOString();
  const tier = row.tier;
  const status = row.status;

  if (tier === "free") {
    await client.query(
      `UPDATE users
       SET tier = 'paid'::user_tier,
           updated_at = now()
       WHERE id = $1`,
      [userId],
    );
    await client.query(
      `INSERT INTO membership_history (
         user_id,
         from_tier,
         to_tier,
         reason,
         changed_by,
         created_at
       ) VALUES ($1, $2::user_tier, $3::user_tier, $4, $5, $6)`,
      [
        userId,
        "free",
        "paid",
        "seed: upgraded to premium",
        staffUserId,
        shiftDate(nowIso, -12),
      ],
    );
    await client.query(
      `INSERT INTO audit_logs (
         actor_user_id,
         action,
         target_type,
         target_id,
         metadata,
         created_at
       ) VALUES ($1, $2, $3, $4, $5::jsonb, $6)`,
      [
        staffUserId,
        "user_admin_update",
        "user",
        userId,
        JSON.stringify({
          before: { tier: "free" },
          after: { tier: "paid" },
          reason: "seed: upgraded to premium",
        }),
        shiftDate(nowIso, -12),
      ],
    );
  }

  if (status === "active") {
    await client.query(
      `UPDATE users
       SET status = 'deactivated'::user_status,
           updated_at = now()
       WHERE id = $1`,
      [userId],
    );
    await client.query(
      `INSERT INTO user_status_changes (
         user_id,
         from_status,
         to_status,
         reason,
         changed_by,
         created_at
       ) VALUES ($1, $2::user_status, $3::user_status, $4, $5, $6)`,
      [
        userId,
        "active",
        "deactivated",
        "seed: temporary lock",
        staffUserId,
        shiftDate(nowIso, -9),
      ],
    );
    await client.query(
      `INSERT INTO audit_logs (
         actor_user_id,
         action,
         target_type,
         target_id,
         metadata,
         created_at
       ) VALUES ($1, $2, $3, $4, $5::jsonb, $6)`,
      [
        staffUserId,
        "user_admin_update",
        "user",
        userId,
        JSON.stringify({
          before: { status: "active" },
          after: { status: "deactivated" },
          reason: "seed: temporary lock",
        }),
        shiftDate(nowIso, -9),
      ],
    );

    await client.query(
      `UPDATE users
       SET status = 'active'::user_status,
           updated_at = now()
       WHERE id = $1`,
      [userId],
    );
    await client.query(
      `INSERT INTO user_status_changes (
         user_id,
         from_status,
         to_status,
         reason,
         changed_by,
         created_at
       ) VALUES ($1, $2::user_status, $3::user_status, $4, $5, $6)`,
      [
        userId,
        "deactivated",
        "active",
        "seed: reinstated",
        staffUserId,
        shiftDate(nowIso, -5),
      ],
    );
    await client.query(
      `INSERT INTO audit_logs (
         actor_user_id,
         action,
         target_type,
         target_id,
         metadata,
         created_at
       ) VALUES ($1, $2, $3, $4, $5::jsonb, $6)`,
      [
        staffUserId,
        "user_admin_update",
        "user",
        userId,
        JSON.stringify({
          before: { status: "deactivated" },
          after: { status: "active" },
          reason: "seed: reinstated",
        }),
        shiftDate(nowIso, -5),
      ],
    );
  }
}

function addAttemptPlan(plans, keySet, plan) {
  if (!plan?.userId || !plan?.quizId) return false;
  const key = `${plan.userId}:${plan.quizId}`;
  if (keySet.has(key)) return false;
  keySet.add(key);
  plans.push(plan);
  return true;
}

async function countQuizQuestions(client, quizId) {
  const res = await client.query(
    `SELECT COUNT(*)::int AS cnt FROM quiz_questions WHERE quiz_id = $1`,
    [quizId],
  );
  return Number(res.rows[0]?.cnt ?? 0);
}

async function seedCustomQuizzes(client, input) {
  const count = Number(input?.count ?? 0);
  if (!Number.isFinite(count) || count <= 0) return [];

  const users = Array.isArray(input?.users) ? input.users : [];
  const topicsBySubject =
    input?.topicsBySubject instanceof Map ? input.topicsBySubject : new Map();
  const quizMetaById =
    input?.quizMetaById instanceof Map ? input.quizMetaById : new Map();

  const owners = [];
  const preferredOwner = users.find((u) => u.email === "paid.1@baihoc.dev");
  if (preferredOwner) owners.push(preferredOwner);
  users.forEach((user) => {
    if (owners.length >= count) return;
    if (owners.some((o) => o.id === user.id)) return;
    owners.push(user);
  });

  const subjectIds = Array.from(topicsBySubject.keys());
  if (!subjectIds.length) return [];

  const results = [];

  for (let i = 0; i < owners.length; i += 1) {
    const owner = owners[i];
    if (!owner?.id) continue;

    const subjectsPicked = sample(
      subjectIds,
      randomInt(1, Math.min(2, subjectIds.length)),
    );
    const topicsBySubjectConfig = subjectsPicked
      .map((subjectId) => {
        const topicIds = topicsBySubject.get(subjectId) ?? [];
        const pickedTopics = sample(
          topicIds,
          randomInt(1, Math.min(2, topicIds.length)),
        );
        if (!pickedTopics.length) return null;
        return { subjectId, topicIds: pickedTopics };
      })
      .filter(Boolean);

    const topicIds = topicsBySubjectConfig.flatMap((entry) => entry.topicIds);
    if (!topicIds.length) continue;

    const questionCount = randomInt(10, 18);
    const difficulty = pick(difficultyLevels);
    const durationSeconds = randomInt(10, 25) * 60;

    const questionRes = await client.query(
      `SELECT id
       FROM (
         SELECT DISTINCT q.id AS id
         FROM questions q
         JOIN question_topics qt ON qt.question_id = q.id
         WHERE q.status = 'active'::question_status
           AND qt.topic_id = ANY($1::uuid[])
       ) t
       ORDER BY random()
       LIMIT $2`,
      [topicIds, questionCount],
    );
    const questionIds = questionRes.rows.map((row) => row.id);
    if (!questionIds.length) continue;

    const config = {
      title: null,
      difficulty,
      questionCount: questionIds.length,
      durationSeconds,
      topicsBySubject: topicsBySubjectConfig,
      computed: {
        topicIds,
      },
    };

    const customQuizRes = await client.query(
      `INSERT INTO custom_quizzes (user_id, status, config)
       VALUES ($1, 'pending'::custom_quiz_status, $2::jsonb)
       RETURNING id`,
      [owner.id, JSON.stringify(config)],
    );
    const customQuizId = customQuizRes.rows[0]?.id ?? null;
    if (!customQuizId) continue;

    const title = `Seed Custom Quiz #${results.length + 1} (${questionIds.length} câu)`;
    const description = `Quiz tuỳ chỉnh theo chủ đề • ${topicIds.length} chủ đề`;

    const quizRes = await client.query(
      `INSERT INTO quizzes (
         title,
         description,
         difficulty_level,
         visibility,
         status,
         is_challenge,
         estimated_time_seconds,
         featured_rank,
         created_by,
         published_at,
         search_vector
       ) VALUES (
         $1,
         $2,
         $3,
         'premium'::quiz_visibility,
         'published'::quiz_status,
         false,
         $4,
         NULL,
         $5,
         now(),
         to_tsvector('simple', coalesce($1, '') || ' ' || coalesce($2, ''))
       )
       RETURNING id`,
      [title, description, difficulty, durationSeconds, owner.id],
    );
    const quizId = quizRes.rows[0]?.id ?? null;
    if (!quizId) continue;

    const quizQuestionRows = questionIds.map((questionId, index) => [
      quizId,
      questionId,
      index + 1,
      null,
      true,
    ]);
    await insertRows(
      client,
      "quiz_questions",
      ["quiz_id", "question_id", "position", "score", "required"],
      quizQuestionRows,
      "ON CONFLICT (quiz_id, question_id) DO NOTHING",
    );

    await client.query(
      `UPDATE custom_quizzes
       SET status = 'ready'::custom_quiz_status,
           generated_quiz_id = $2,
           updated_at = now(),
           ready_at = now()
       WHERE id = $1`,
      [customQuizId, quizId],
    );

    quizMetaById.set(quizId, {
      title,
      difficulty,
      estimatedTimeSeconds: durationSeconds,
      isChallenge: false,
      status: "published",
    });

    results.push({ customQuizId, quizId, userId: owner.id });
    if (results.length >= count) break;
  }

  return results;
}

async function seedHighlightChallenge(client, input) {
  const staffUserId = input?.staffUserId ?? null;
  if (!staffUserId) return null;

  const preferred = input?.preferredChallengeQuizId ?? null;
  const preferredQuestionId = input?.preferredQuestionId ?? null;

  const quizId = await (async () => {
    if (preferred) {
      const res = await client.query(
        `SELECT q.id
         FROM quizzes q
         JOIN challenge_settings cs ON cs.quiz_id = q.id
         WHERE q.id = $1
           AND q.status = 'published'::quiz_status
           AND q.is_challenge IS TRUE
           AND cs.start_at <= now()
           AND cs.end_at > now()
         LIMIT 1`,
        [preferred],
      );
      if (res.rows[0]?.id) return res.rows[0].id;
    }

    const res = await client.query(
      `SELECT q.id
       FROM quizzes q
       JOIN challenge_settings cs ON cs.quiz_id = q.id
       WHERE q.status = 'published'::quiz_status
         AND q.is_challenge IS TRUE
         AND cs.start_at <= now()
         AND cs.end_at > now()
       ORDER BY cs.end_at ASC, q.id ASC
       LIMIT 1`,
    );
    return res.rows[0]?.id ?? null;
  })();

  if (!quizId) return null;

  const questionId = await (async () => {
    if (preferredQuestionId) {
      const res = await client.query(
        `SELECT qq.question_id
         FROM quiz_questions qq
         JOIN questions q ON q.id = qq.question_id
         LEFT JOIN question_passages qp ON qp.question_id = q.id
         WHERE qq.quiz_id = $1
           AND qq.question_id = $2
           AND q.type IN ('mcq_single'::question_type, 'mcq_multi'::question_type)
           AND qp.question_id IS NULL
         LIMIT 1`,
        [quizId, preferredQuestionId],
      );
      if (res.rows[0]?.question_id) return res.rows[0].question_id;
    }

    const res = await client.query(
      `SELECT qq.question_id
       FROM quiz_questions qq
       JOIN questions q ON q.id = qq.question_id
       LEFT JOIN question_passages qp ON qp.question_id = q.id
       WHERE qq.quiz_id = $1
         AND q.type IN ('mcq_single'::question_type, 'mcq_multi'::question_type)
         AND qp.question_id IS NULL
       ORDER BY qq.position ASC
       LIMIT 1`,
      [quizId],
    );
    return res.rows[0]?.question_id ?? null;
  })();
  if (!questionId) return null;

  await client.query(
    `INSERT INTO dashboard_highlight_challenge (
       id,
       quiz_id,
       question_id,
       updated_by,
       updated_at
     ) VALUES (1, $1, $2, $3, now())
     ON CONFLICT (id)
     DO UPDATE SET quiz_id = EXCLUDED.quiz_id,
                   question_id = EXCLUDED.question_id,
                   updated_by = EXCLUDED.updated_by,
                   updated_at = EXCLUDED.updated_at`,
    [quizId, questionId, staffUserId],
  );

  return { quizId, questionId };
}

async function seedHighlightSubmission(client, input) {
  const { userId, quizId, questionId } = input ?? {};
  if (!userId || !quizId || !questionId) return;

  const optionRes = await client.query(
    `SELECT id, is_correct
     FROM question_options
     WHERE question_id = $1
     ORDER BY position ASC`,
    [questionId],
  );
  const options = optionRes.rows.map((row) => ({
    id: row.id,
    isCorrect: row.is_correct === true,
  }));
  const correct = options.filter((o) => o.isCorrect).map((o) => o.id);
  const incorrect = options.filter((o) => !o.isCorrect).map((o) => o.id);

  if (!options.length || !correct.length) return;

  const selectedOptionIds =
    Math.random() < 0.6
      ? correct
      : incorrect.length
        ? [pick(incorrect)]
        : correct;

  const selectedSet = new Set(selectedOptionIds);
  const correctSet = new Set(correct);
  const isCorrect =
    selectedSet.size === correctSet.size &&
    Array.from(correctSet).every((id) => selectedSet.has(id));

  await client.query(
    `INSERT INTO dashboard_highlight_challenge_submissions (
       user_id,
       quiz_id,
       question_id,
       selected_option_ids,
       is_correct,
       created_at
     ) VALUES ($1, $2, $3, $4::uuid[], $5, now())
     ON CONFLICT (user_id, quiz_id, question_id) DO NOTHING`,
    [userId, quizId, questionId, selectedOptionIds, isCorrect],
  );
}

async function listQuizGradingData(client, quizId) {
  const baseRes = await client.query(
    `SELECT qq.question_id,
            qq.position,
            qq.score,
            qq.required,
            q.type,
            q.default_score,
            q.subject_id,
            subj.name AS subject_name,
            subj.slug AS subject_slug,
            q.updated_at AS question_updated_at
     FROM quiz_questions qq
     JOIN questions q ON q.id = qq.question_id
     JOIN subjects subj ON subj.id = q.subject_id
     WHERE qq.quiz_id = $1
     ORDER BY qq.position ASC`,
    [quizId],
  );

  const questionIds = baseRes.rows.map((row) => row.question_id);
  if (!questionIds.length) return [];

  const [optionRes, shortAnswerRes] = await Promise.all([
    client.query(
      `SELECT id, question_id, is_correct
       FROM question_options
       WHERE question_id = ANY($1::uuid[])`,
      [questionIds],
    ),
    client.query(
      `SELECT question_id, acceptable_answer, case_sensitive
       FROM short_answer_keys
       WHERE question_id = ANY($1::uuid[])`,
      [questionIds],
    ),
  ]);

  const optionGroups = new Map();
  optionRes.rows.forEach((row) => {
    const list = optionGroups.get(row.question_id) ?? [];
    list.push({ id: row.id, isCorrect: row.is_correct === true });
    optionGroups.set(row.question_id, list);
  });

  const shortAnswerGroups = new Map();
  shortAnswerRes.rows.forEach((row) => {
    const list = shortAnswerGroups.get(row.question_id) ?? [];
    list.push({
      acceptableAnswer: row.acceptable_answer,
      caseSensitive: row.case_sensitive === true,
    });
    shortAnswerGroups.set(row.question_id, list);
  });

  return baseRes.rows.map((row) => {
    const options = optionGroups.get(row.question_id) ?? [];
    return {
      questionId: row.question_id,
      position: row.position,
      score: row.score !== null ? Number(row.score) : null,
      required: row.required === true,
      type: row.type,
      defaultScore: Number(row.default_score),
      subjectId: row.subject_id,
      subjectName: row.subject_name,
      subjectSlug: row.subject_slug,
      questionUpdatedAt: row.question_updated_at,
      optionIds: options.map((opt) => opt.id),
      correctOptionIds: options
        .filter((opt) => opt.isCorrect)
        .map((opt) => opt.id),
      shortAnswerKeys: shortAnswerGroups.get(row.question_id) ?? [],
    };
  });
}

function computeIrtWeight(stat) {
  const attemptCount = Number(stat?.firstAttemptCount ?? 0);
  const correctCount = Number(stat?.firstCorrectCount ?? 0);

  const priorAttempts = 4;
  const priorCorrect = 2;
  const pCorrect =
    (correctCount + priorCorrect) / Math.max(1, attemptCount + priorAttempts);
  const difficulty = 1 - Math.min(1, Math.max(0, pCorrect));

  const minWeight = 4;
  const maxWeight = 10;
  const weight = Math.round(minWeight + difficulty * (maxWeight - minWeight));
  return Math.min(maxWeight, Math.max(minWeight, weight));
}

function normalizeOptionIds(ids) {
  if (!ids) return null;
  const unique = Array.from(new Set(ids));
  unique.sort();
  return unique;
}

function normalizeTextAnswer(input) {
  if (input === null || input === undefined) return null;
  const trimmed = String(input).trim();
  return trimmed.length ? trimmed : null;
}

function matchesOptions(selectedOptionIds, correctOptionIds) {
  const selected = new Set(selectedOptionIds ?? []);
  const correct = new Set(correctOptionIds ?? []);
  if (selected.size !== correct.size) return false;
  for (const id of correct) {
    if (!selected.has(id)) return false;
  }
  return true;
}

function matchesShortAnswer(input, keys) {
  const normalized = normalizeTextAnswer(input);
  if (!normalized) return false;
  const trimmed = normalized.trim();
  return (keys ?? []).some((key) => {
    const acceptable = String(key.acceptableAnswer ?? "").trim();
    if (!acceptable) return false;
    if (key.caseSensitive) return trimmed === acceptable;
    return trimmed.toLowerCase() === acceptable.toLowerCase();
  });
}

function computeQuizContentHashSnapshot(gradingData) {
  const parts = gradingData.map((question) => {
    const score = question.score === null ? "null" : String(question.score);
    return [
      question.position,
      question.questionId,
      question.type,
      question.required ? 1 : 0,
      score,
      question.defaultScore,
      question.questionUpdatedAt,
    ].join("|");
  });
  return crypto.createHash("sha256").update(parts.join("\n")).digest("hex");
}

function computeSubjectScores(gradingData, gradedAnswers) {
  const gradedMap = new Map();
  gradedAnswers.forEach((answer) => {
    gradedMap.set(answer.questionId, {
      awardedScore: answer.awardedScore,
      awardedIrtScore: answer.awardedIrtScore,
      isCorrect: answer.isCorrect === true,
    });
  });

  const bySubject = new Map();
  gradingData.forEach((question) => {
    const subjectId = question.subjectId;
    const agg = bySubject.get(subjectId) ?? {
      subjectId,
      name: question.subjectName,
      slug: question.subjectSlug,
      totalQuestions: 0,
      correctCount: 0,
      totalPossible: 0,
      awarded: 0,
      irtScore: 0,
    };
    const maxScore =
      question.score !== null ? question.score : question.defaultScore;
    agg.totalQuestions += 1;
    agg.totalPossible += maxScore;
    const graded = gradedMap.get(question.questionId);
    if (graded) {
      agg.awarded += graded.awardedScore;
      agg.irtScore += graded.awardedIrtScore;
      if (graded.isCorrect) agg.correctCount += 1;
    }
    bySubject.set(subjectId, agg);
  });

  const scores = Array.from(bySubject.values()).map((agg) => ({
    subjectId: agg.subjectId,
    name: agg.name,
    slug: agg.slug,
    correctCount: agg.correctCount,
    totalQuestions: agg.totalQuestions,
    irtScore: agg.irtScore,
    scorePercent:
      agg.totalPossible > 0
        ? Number(((agg.awarded / agg.totalPossible) * 100).toFixed(2))
        : 0,
  }));

  scores.sort((a, b) => {
    if (b.scorePercent !== a.scorePercent)
      return b.scorePercent - a.scorePercent;
    if (b.totalQuestions !== a.totalQuestions)
      return b.totalQuestions - a.totalQuestions;
    return a.name.localeCompare(b.name, "vi");
  });

  return scores;
}

function computeCorrectChance(difficulty) {
  const level = Number(difficulty ?? 3);
  const base = 0.85 - (Math.max(1, Math.min(5, level)) - 1) * 0.12;
  return Math.min(0.9, Math.max(0.25, base));
}

function generateAnswer(question, correctChance) {
  const wantsCorrect = Math.random() < correctChance;

  if (question.type === "short_answer") {
    if (wantsCorrect && question.shortAnswerKeys?.length) {
      const key = pick(question.shortAnswerKeys);
      return { selectedOptionIds: null, textAnswer: key.acceptableAnswer };
    }
    return {
      selectedOptionIds: null,
      textAnswer: `wrong-${question.subjectSlug}-${question.position}`,
    };
  }

  const optionIds = question.optionIds ?? [];
  const correctOptionIds = question.correctOptionIds ?? [];
  if (!optionIds.length || !correctOptionIds.length) {
    return { selectedOptionIds: null, textAnswer: null };
  }

  if (wantsCorrect) {
    if (question.type === "mcq_single") {
      return { selectedOptionIds: [correctOptionIds[0]], textAnswer: null };
    }
    return { selectedOptionIds: [...correctOptionIds], textAnswer: null };
  }

  if (question.type === "mcq_single") {
    const wrong = optionIds.filter((id) => !correctOptionIds.includes(id));
    return {
      selectedOptionIds: [pick(wrong.length ? wrong : optionIds)],
      textAnswer: null,
    };
  }

  // mcq_multi wrong: pick a set that is not exactly the correct set.
  const targetSize = randomInt(1, Math.min(3, optionIds.length));
  let picked = normalizeOptionIds(sample(optionIds, targetSize)) ?? [];
  const correctSet = new Set(correctOptionIds);
  const pickedSet = new Set(picked);
  const equals =
    pickedSet.size === correctSet.size &&
    Array.from(correctSet).every((id) => pickedSet.has(id));
  if (equals) {
    const wrong = optionIds.filter((id) => !correctSet.has(id));
    if (wrong.length)
      picked = normalizeOptionIds([...picked, pick(wrong)]) ?? picked;
  }

  return { selectedOptionIds: picked, textAnswer: null };
}

async function seedAttempts(client, input) {
  const plans = Array.isArray(input?.plans) ? input.plans : [];
  const quizMetaById =
    input?.quizMetaById instanceof Map ? input.quizMetaById : new Map();
  if (!plans.length) return { attempts: 0, answers: 0, xpEvents: 0 };

  const gradingByQuizId = new Map();
  const quizIds = Array.from(
    new Set(plans.map((p) => p.quizId).filter(Boolean)),
  );
  for (const quizId of quizIds) {
    gradingByQuizId.set(quizId, await listQuizGradingData(client, quizId));
  }

  const allQuestionIds = Array.from(
    new Set(
      Array.from(gradingByQuizId.values())
        .flatMap((grading) => grading.map((q) => q.questionId))
        .filter(Boolean),
    ),
  );

  const irtStatsByQuestionId = new Map();
  if (allQuestionIds.length) {
    const irtRes = await client.query(
      `SELECT question_id, first_attempt_count, first_correct_count
       FROM question_irt_stats
       WHERE question_id = ANY($1::uuid[])`,
      [allQuestionIds],
    );
    irtRes.rows.forEach((row) => {
      irtStatsByQuestionId.set(row.question_id, {
        firstAttemptCount: Number(row.first_attempt_count ?? 0),
        firstCorrectCount: Number(row.first_correct_count ?? 0),
      });
    });
  }

  const attemptRows = [];
  const answerRows = [];
  const answerEventRows = [];
  const snapshotRows = [];
  const firstAttemptRows = [];
  const xpEventByAttemptId = new Map();
  const gradedByAttemptId = new Map();

  for (const plan of plans) {
    const gradingData = gradingByQuizId.get(plan.quizId) ?? [];
    if (!gradingData.length) continue;

    const quizMeta = quizMetaById.get(plan.quizId) ?? null;
    const quizDifficulty = quizMeta?.difficulty ?? 3;
    const correctChance = computeCorrectChance(quizDifficulty);
    const timeLimitSeconds =
      typeof plan.timeLimitSeconds === "number" && plan.timeLimitSeconds > 0
        ? Math.round(plan.timeLimitSeconds)
        : null;

    if (plan.status === "in_progress") {
      const totalQuestions = gradingData.length;
      const remainingSeconds =
        timeLimitSeconds !== null ? Math.max(0, timeLimitSeconds - 60) : null;

      attemptRows.push([
        plan.attemptId,
        plan.userId,
        plan.quizId,
        plan.challengeId ?? null,
        plan.customQuizId ?? null,
        "in_progress",
        plan.startedAt,
        null,
        null,
        timeLimitSeconds,
        remainingSeconds,
        0,
        0,
        0,
        totalQuestions,
        0,
        null,
        null,
        null,
        null,
        null,
        null,
        false,
        plan.startedAt,
      ]);

      const answered = sample(gradingData, Math.min(2, gradingData.length));
      answered.forEach((question) => {
        const answer = generateAnswer(question, correctChance);
        answerRows.push([
          plan.attemptId,
          question.questionId,
          normalizeOptionIds(answer.selectedOptionIds),
          normalizeTextAnswer(answer.textAnswer),
          null,
          null,
          0,
          new Date().toISOString(),
          true,
        ]);
        answerEventRows.push([
          plan.attemptId,
          question.questionId,
          {
            selectedOptionIds: normalizeOptionIds(answer.selectedOptionIds),
            textAnswer: normalizeTextAnswer(answer.textAnswer),
            remainingSeconds,
          },
          "autosave",
          new Date().toISOString(),
        ]);
      });

      continue;
    }

    const gradedAnswers = gradingData.map((question) => {
      const answer = generateAnswer(question, correctChance);
      const selectedOptionIds = normalizeOptionIds(answer.selectedOptionIds);
      const textAnswer = normalizeTextAnswer(answer.textAnswer);

      const questionScore =
        question.score !== null ? question.score : question.defaultScore;
      const isCorrect =
        question.type === "short_answer"
          ? matchesShortAnswer(textAnswer, question.shortAnswerKeys)
          : matchesOptions(selectedOptionIds, question.correctOptionIds);

      const awardedScore = isCorrect ? questionScore : 0;
      const irtWeight = computeIrtWeight(
        irtStatsByQuestionId.get(question.questionId),
      );
      const awardedIrtScore = isCorrect ? irtWeight : 0;

      return {
        questionId: question.questionId,
        selectedOptionIds,
        textAnswer,
        isCorrect,
        awardedScore,
        awardedIrtScore,
      };
    });

    gradedByAttemptId.set(plan.attemptId, gradedAnswers);

    let correctCount = 0;
    let scoreRaw = 0;
    let totalPossible = 0;
    let irtScore = 0;
    gradedAnswers.forEach((answer) => {
      const question = gradingData.find(
        (q) => q.questionId === answer.questionId,
      );
      const questionScore =
        question && question.score !== null
          ? question.score
          : (question?.defaultScore ?? 1);
      totalPossible += questionScore;
      if (answer.isCorrect) correctCount += 1;
      scoreRaw += answer.awardedScore;
      irtScore += answer.awardedIrtScore;
    });
    const scorePercent =
      totalPossible > 0
        ? Number(((scoreRaw / totalPossible) * 100).toFixed(2))
        : 0;

    const subjectScores = computeSubjectScores(gradingData, gradedAnswers);
    const subjectScoresJson = JSON.stringify(subjectScores);
    const subjectAllocations = subjectScores.map((subject) => ({
      subjectId: subject.subjectId,
      amount: subject.irtScore,
    }));
    const quizContentHash = computeQuizContentHashSnapshot(gradingData);

    const quizTitle = quizMeta?.title ?? null;
    const snapshotDifficulty = quizMeta?.difficulty ?? null;
    const snapshotEstimatedTimeSeconds = quizMeta?.estimatedTimeSeconds ?? null;
    const snapshotIsChallenge =
      quizMeta?.isChallenge ?? (plan.challengeId ?? null) !== null;

    attemptRows.push([
      plan.attemptId,
      plan.userId,
      plan.quizId,
      plan.challengeId ?? null,
      plan.customQuizId ?? null,
      plan.status,
      plan.startedAt,
      plan.submittedAt,
      plan.submittedAt,
      timeLimitSeconds,
      0,
      scoreRaw,
      scorePercent,
      correctCount,
      gradingData.length,
      irtScore,
      quizContentHash,
      quizTitle,
      snapshotDifficulty,
      snapshotEstimatedTimeSeconds,
      snapshotIsChallenge,
      subjectScoresJson,
      false,
      plan.startedAt,
    ]);

    gradedAnswers.forEach((answer) => {
      answerRows.push([
        plan.attemptId,
        answer.questionId,
        answer.selectedOptionIds,
        answer.textAnswer,
        answer.isCorrect,
        answer.awardedScore,
        answer.awardedIrtScore,
        plan.submittedAt ?? new Date().toISOString(),
        false,
      ]);

      answerEventRows.push([
        plan.attemptId,
        answer.questionId,
        {
          selectedOptionIds: answer.selectedOptionIds,
          textAnswer: answer.textAnswer,
          isCorrect: answer.isCorrect,
          awardedScore: answer.awardedScore,
          awardedIrtScore: answer.awardedIrtScore,
        },
        "submit",
        plan.submittedAt ?? new Date().toISOString(),
      ]);
    });

    gradingData.forEach((question) => {
      const maxScore =
        question.score !== null ? question.score : question.defaultScore;
      snapshotRows.push([
        plan.attemptId,
        1,
        question.position,
        question.questionId,
        question.type,
        maxScore,
        question.required,
        question.subjectId,
        question.subjectName,
        question.subjectSlug,
        question.questionUpdatedAt,
      ]);
    });

    firstAttemptRows.push([
      plan.userId,
      plan.quizId,
      plan.attemptId,
      plan.submittedAt ?? plan.startedAt,
    ]);

    xpEventByAttemptId.set(plan.attemptId, {
      userId: plan.userId,
      source: plan.challengeId ? "challenge" : "attempt",
      amount: irtScore,
      metadata: { quizId: plan.quizId, subjectAllocations },
      createdAt: plan.submittedAt ?? new Date().toISOString(),
    });
  }

  await insertRows(
    client,
    "attempts",
    [
      "id",
      "user_id",
      "quiz_id",
      "challenge_id",
      "custom_quiz_id",
      "status",
      "started_at",
      "submitted_at",
      "judged_at",
      "time_limit_seconds",
      "remaining_seconds",
      "score_raw",
      "score_percent",
      "correct_count",
      "total_questions",
      "xp_earned",
      "quiz_content_hash_snapshot",
      "snapshot_quiz_title",
      "snapshot_quiz_difficulty_level",
      "snapshot_quiz_estimated_time_seconds",
      "snapshot_quiz_is_challenge",
      "snapshot_subject_scores",
      "snapshot_subject_scores_estimated",
      "created_at",
    ],
    attemptRows,
  );

  if (answerRows.length) {
    await insertRows(
      client,
      "attempt_answers",
      [
        "attempt_id",
        "question_id",
        "selected_option_ids",
        "text_answer",
        "is_correct",
        "awarded_score",
        "awarded_irt_score",
        "answered_at",
        "auto_saved",
      ],
      answerRows,
      "ON CONFLICT (attempt_id, question_id) DO UPDATE SET selected_option_ids = EXCLUDED.selected_option_ids, text_answer = EXCLUDED.text_answer, answered_at = EXCLUDED.answered_at, auto_saved = EXCLUDED.auto_saved",
    );
  }

  if (answerEventRows.length) {
    await insertRows(
      client,
      "attempt_answer_events",
      ["attempt_id", "question_id", "payload", "event_type", "created_at"],
      answerEventRows,
    );
  }

  if (snapshotRows.length) {
    await insertRows(
      client,
      "attempt_question_snapshots",
      [
        "attempt_id",
        "judgement_version",
        "position",
        "question_id",
        "question_type",
        "max_score",
        "required",
        "subject_id",
        "subject_name",
        "subject_slug",
        "question_updated_at",
      ],
      snapshotRows,
      "ON CONFLICT (attempt_id, judgement_version, question_id) DO NOTHING",
    );
  }

  let xpInserted = 0;
  let firstAttemptIdSet = new Set();
  if (firstAttemptRows.length) {
    await insertRows(
      client,
      "user_quiz_first_attempts",
      ["user_id", "quiz_id", "attempt_id", "created_at"],
      firstAttemptRows,
      "ON CONFLICT (user_id, quiz_id) DO NOTHING",
    );

    const attemptIds = firstAttemptRows.map((row) => row[2]);
    const insertedRes = await client.query(
      `SELECT attempt_id
       FROM user_quiz_first_attempts
       WHERE attempt_id = ANY($1::uuid[])`,
      [attemptIds],
    );
    firstAttemptIdSet = new Set(insertedRes.rows.map((row) => row.attempt_id));
  }

  const xpRows = Array.from(xpEventByAttemptId.entries())
    .filter(([attemptId]) => firstAttemptIdSet.has(attemptId))
    .map(([, event]) => [
      event.userId,
      event.source,
      event.amount,
      event.metadata,
      event.createdAt,
    ]);

  if (xpRows.length) {
    xpInserted = xpRows.length;
    await insertRows(
      client,
      "xp_events",
      ["user_id", "source", "amount", "metadata", "created_at"],
      xpRows,
    );
  }

  if (firstAttemptIdSet.size) {
    const deltasByQuestion = new Map();
    for (const attemptId of firstAttemptIdSet) {
      const gradedAnswers = gradedByAttemptId.get(attemptId) ?? [];
      gradedAnswers.forEach((answer) => {
        const prev = deltasByQuestion.get(answer.questionId) ?? {
          attemptDelta: 0,
          correctDelta: 0,
        };
        prev.attemptDelta += 1;
        if (answer.isCorrect) prev.correctDelta += 1;
        deltasByQuestion.set(answer.questionId, prev);
      });
    }

    const deltaRows = Array.from(deltasByQuestion.entries()).map(
      ([questionId, delta]) => [
        questionId,
        delta.attemptDelta,
        delta.correctDelta,
        new Date().toISOString(),
      ],
    );

    if (deltaRows.length) {
      await insertRows(
        client,
        "question_irt_stats",
        [
          "question_id",
          "first_attempt_count",
          "first_correct_count",
          "updated_at",
        ],
        deltaRows,
        "ON CONFLICT (question_id) DO UPDATE SET first_attempt_count = GREATEST(0, question_irt_stats.first_attempt_count + EXCLUDED.first_attempt_count), first_correct_count = GREATEST(0, question_irt_stats.first_correct_count + EXCLUDED.first_correct_count), updated_at = EXCLUDED.updated_at",
      );
    }
  }

  return {
    attempts: attemptRows.length,
    answers: answerRows.length,
    xpEvents: xpInserted,
  };
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

function _buildDemoQuestionList({
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

function loadDemoQuestionBank() {
  const demoPath = "scripts/db/demo-questions.json";
  if (!fs.existsSync(demoPath)) {
    throw new Error(`Seed misconfigured: missing ${demoPath}.`);
  }
  const raw = fs.readFileSync(demoPath, "utf8");
  const questions = JSON.parse(raw);
  const validQuestions = questions.filter(
    (question) =>
      question.options.length === 4 && Number.isInteger(question.correctIndex),
  );
  if (validQuestions.length < DEMO_1_QUESTION_IDS.length) {
    throw new Error(
      `Seed misconfigured: demo question bank needs at least ${DEMO_1_QUESTION_IDS.length} valid questions.`,
    );
  }
  return validQuestions;
}

function loadDemoTopicSeeds() {
  const questions = loadDemoQuestionBank();
  const topics = [];
  const seen = new Set();
  questions.forEach((question) => {
    if (!question.topicSlug || !question.topicName || !question.subjectSlug) {
      return;
    }
    if (seen.has(question.topicSlug)) return;
    seen.add(question.topicSlug);
    topics.push({
      subjectSlug: question.subjectSlug,
      topicName: question.topicName,
      topicSlug: question.topicSlug,
    });
  });
  return topics;
}

function seedDemo1Questions({
  questionRows,
  questionOptionRows,
  questionTopicRows,
  passageRows,
  questionPassageRows,
  subjectBySlug,
  topicIdBySlug,
  staffUserId,
}) {
  const requireSubject = (slug) => {
    const subject = subjectBySlug.get(slug);
    if (!subject?.id) {
      throw new Error(`Seed misconfigured: subject slug "${slug}" not found.`);
    }
    return subject;
  };

  const passageIdsByContent = new Map();
  const passagePositions = new Map();
  const passageQuestionIds = new Map();
  const subjectStandaloneIds = new Map();
  const subjectPassageIds = new Map();
  const demoChallengeQuestionIds = [];
  let highlightQuestionId = null;
  const demoQuestionIdsBySubject = new Map();

  const addMcqSingle = ({
    questionId,
    subjectSlug,
    topicSlug,
    stem,
    options,
    correctIndex,
    explanation,
    difficulty = 3,
    passage,
  }) => {
    const subject = requireSubject(subjectSlug);
    const topicId =
      topicSlug && topicIdBySlug instanceof Map
        ? topicIdBySlug.get(topicSlug)
        : null;
    questionRows.push([
      questionId,
      subject.id,
      difficulty,
      "mcq_single",
      stem,
      explanation ?? null,
      "active",
      ["demo-1", subjectSlug],
      1,
      staffUserId,
    ]);

    const labels = ["A", "B", "C", "D"];
    if (!Array.isArray(options) || options.length !== 4) {
      throw new Error(
        `Seed misconfigured: demo-1 question ${questionId} must have 4 options.`,
      );
    }
    labels.forEach((label, idx) => {
      questionOptionRows.push([
        questionId,
        label,
        options[idx],
        idx === correctIndex,
        idx + 1,
      ]);
    });
    if (topicId) {
      questionTopicRows.push([questionId, topicId]);
    } else if (topicSlug) {
      throw new Error(
        `Seed misconfigured: topic slug "${topicSlug}" not found for demo question.`,
      );
    }

    if (passage) {
      let passageId = passageIdsByContent.get(passage);
      if (!passageId) {
        passageId = crypto.randomUUID();
        passageIdsByContent.set(passage, passageId);
        passageRows.push([passageId, passage]);
      }
      const position = (passagePositions.get(passageId) ?? 0) + 1;
      passagePositions.set(passageId, position);
      questionPassageRows.push([questionId, passageId, position]);
      const passageIds = subjectPassageIds.get(subject.id) ?? new Set();
      passageIds.add(passageId);
      subjectPassageIds.set(subject.id, passageIds);
      const ids = passageQuestionIds.get(passageId) ?? [];
      ids.push(questionId);
      passageQuestionIds.set(passageId, ids);
    } else {
      const ids = subjectStandaloneIds.get(subject.id) ?? [];
      ids.push(questionId);
      subjectStandaloneIds.set(subject.id, ids);
    }
  };

  const demoQuestions = loadDemoQuestionBank();
  const specs = demoQuestions.map((question, index) => ({
    ...question,
    questionId:
      index < DEMO_1_QUESTION_IDS.length
        ? DEMO_1_QUESTION_IDS[index]
        : crypto.randomUUID(),
  }));
  DEMO_1_QUESTION_IDS.forEach((id) => {
    demoChallengeQuestionIds.push(id);
  });

  specs.forEach((question) => {
    addMcqSingle(question);
    if (question.isHighlight && !question.passage && !highlightQuestionId) {
      highlightQuestionId = question.questionId;
    }
    const subject = subjectBySlug.get(question.subjectSlug);
    if (!subject?.id) return;
    const ids = demoQuestionIdsBySubject.get(subject.id) ?? [];
    ids.push(question.questionId);
    demoQuestionIdsBySubject.set(subject.id, ids);
  });

  const demoQuestionGroupsBySubject = new Map();
  for (const [subjectId, passageIds] of subjectPassageIds.entries()) {
    const groups = [];
    passageIds.forEach((passageId) => {
      const ids = passageQuestionIds.get(passageId);
      if (ids?.length) groups.push(ids);
    });
    const standalone = subjectStandaloneIds.get(subjectId) ?? [];
    standalone.forEach((id) => {
      groups.push([id]);
    });
    demoQuestionGroupsBySubject.set(subjectId, groups);
  }
  for (const [subjectId, ids] of subjectStandaloneIds.entries()) {
    if (demoQuestionGroupsBySubject.has(subjectId)) continue;
    demoQuestionGroupsBySubject.set(
      subjectId,
      ids.map((id) => [id]),
    );
  }

  return {
    demoChallengeQuestionIds,
    demoQuestionIdsBySubject,
    demoQuestionGroupsBySubject,
    highlightQuestionId,
  };
}

main();
