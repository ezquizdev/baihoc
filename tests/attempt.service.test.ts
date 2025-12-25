import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AttemptRow } from "@/application/infra/db/attemptRepo";
import {
  autosaveAttempt,
  startOrResumeAttempt,
  submitAttempt,
} from "@/application/services/attemptService";
import { ServiceError } from "@/application/services/errors";

vi.mock("@/application/infra/db/attemptRepo", () => ({
  createAttempt: vi.fn(),
  findChallengeAttempt: vi.fn(),
  findInProgressAttempt: vi.fn(),
  getAttemptById: vi.fn(),
  getAttemptState: vi.fn(),
  getQuizAttemptMeta: vi.fn(),
  listAttemptAnswers: vi.fn(),
  listQuizGradingData: vi.fn(),
  listQuizQuestionMetaByIds: vi.fn(),
  saveAttemptAnswers: vi.fn(),
  submitAttempt: vi.fn(),
}));

const attemptRepo = await import("@/application/infra/db/attemptRepo");

const baseAttemptRow: AttemptRow = {
  id: "attempt-1",
  user_id: "user-1",
  quiz_id: "quiz-1",
  challenge_id: null,
  custom_quiz_id: null,
  status: "in_progress",
  started_at: new Date().toISOString(),
  submitted_at: null,
  time_limit_seconds: 600,
  remaining_seconds: 600,
  score_raw: 0,
  score_percent: 0,
  correct_count: 0,
  total_questions: 2,
  irt_estimate: null,
  xp_earned: 0,
  created_at: new Date().toISOString(),
};

const baseAttemptState = {
  attempt: {
    id: "attempt-1",
    quizId: "quiz-1",
    status: "in_progress",
    startedAt: baseAttemptRow.started_at,
    submittedAt: null,
    timeLimitSeconds: 600,
    remainingSeconds: 600,
    scoreRaw: 0,
    scorePercent: 0,
    correctCount: 0,
    totalQuestions: 2,
    xpEarned: 0,
  },
  ownerId: "user-1",
  quizId: "quiz-1",
  questions: [],
  answers: [],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("attemptService", () => {
  it("creates a new attempt when none in progress", async () => {
    vi.mocked(attemptRepo.getQuizAttemptMeta).mockResolvedValue({
      quizId: "quiz-1",
      isChallenge: false,
      estimatedTimeSeconds: 600,
      challengeTimeLimitSeconds: null,
      challengeStartAt: null,
      challengeEndAt: null,
      totalQuestions: 2,
    });
    vi.mocked(attemptRepo.findInProgressAttempt).mockResolvedValue(null);
    vi.mocked(attemptRepo.createAttempt).mockResolvedValue({
      ...baseAttemptRow,
    });

    const result = await startOrResumeAttempt("user-1", "quiz-1");

    expect(attemptRepo.createAttempt).toHaveBeenCalledTimes(1);
    expect(result.attemptId).toBe("attempt-1");
  });

  it("resumes an in-progress attempt", async () => {
    vi.mocked(attemptRepo.getQuizAttemptMeta).mockResolvedValue({
      quizId: "quiz-1",
      isChallenge: false,
      estimatedTimeSeconds: 600,
      challengeTimeLimitSeconds: null,
      challengeStartAt: null,
      challengeEndAt: null,
      totalQuestions: 2,
    });
    vi.mocked(attemptRepo.findInProgressAttempt).mockResolvedValue({
      ...baseAttemptRow,
    });

    const result = await startOrResumeAttempt("user-1", "quiz-1");

    expect(attemptRepo.createAttempt).not.toHaveBeenCalled();
    expect(result.attemptId).toBe("attempt-1");
  });

  it("returns existing challenge attempt when already submitted", async () => {
    vi.mocked(attemptRepo.getQuizAttemptMeta).mockResolvedValue({
      quizId: "quiz-1",
      isChallenge: true,
      estimatedTimeSeconds: 600,
      challengeTimeLimitSeconds: 600,
      challengeStartAt: new Date(Date.now() - 60_000).toISOString(),
      challengeEndAt: new Date(Date.now() + 60_000).toISOString(),
      totalQuestions: 2,
    });
    vi.mocked(attemptRepo.findChallengeAttempt).mockResolvedValue({
      ...baseAttemptRow,
      status: "submitted",
    });

    const result = await startOrResumeAttempt("user-1", "quiz-1");

    expect(result).toMatchObject({ attemptId: "attempt-1", resumed: true });
  });

  it("rejects autosave after time expiry", async () => {
    const expiredAttempt = {
      ...baseAttemptRow,
      started_at: new Date(Date.now() - 120_000).toISOString(),
      time_limit_seconds: 60,
      remaining_seconds: 10,
    };
    vi.mocked(attemptRepo.getAttemptById).mockResolvedValue(expiredAttempt);
    vi.mocked(attemptRepo.listQuizQuestionMetaByIds).mockResolvedValue([
      { questionId: "q1", type: "mcq_single" },
    ]);

    await expect(
      autosaveAttempt("user-1", "attempt-1", {
        answers: [{ questionId: "q1", selectedOptionIds: ["opt-1"] }],
        remainingSeconds: 5,
      }),
    ).rejects.toMatchObject({ code: "ATTEMPT_EXPIRED" });
  });

  it("blocks starting a challenge outside the active window", async () => {
    vi.mocked(attemptRepo.getQuizAttemptMeta).mockResolvedValue({
      quizId: "quiz-1",
      isChallenge: true,
      estimatedTimeSeconds: 600,
      challengeTimeLimitSeconds: 600,
      challengeStartAt: new Date(Date.now() + 60_000).toISOString(),
      challengeEndAt: new Date(Date.now() + 120_000).toISOString(),
      totalQuestions: 2,
    });
    vi.mocked(attemptRepo.findChallengeAttempt).mockResolvedValue(null);

    await expect(
      startOrResumeAttempt("user-1", "quiz-1"),
    ).rejects.toMatchObject({
      code: "CHALLENGE_NOT_ACTIVE",
    });
  });

  it("grades submit and computes stats", async () => {
    vi.mocked(attemptRepo.getAttemptById).mockResolvedValue(baseAttemptRow);
    vi.mocked(attemptRepo.listQuizGradingData).mockResolvedValue([
      {
        questionId: "q1",
        type: "mcq_single",
        defaultScore: 2,
        score: null,
        position: 1,
        optionIds: ["opt-1", "opt-2"],
        correctOptionIds: ["opt-1"],
        shortAnswerKeys: [],
      },
      {
        questionId: "q2",
        type: "short_answer",
        defaultScore: 3,
        score: null,
        position: 2,
        optionIds: [],
        correctOptionIds: [],
        shortAnswerKeys: [{ acceptableAnswer: "Paris", caseSensitive: false }],
      },
    ]);
    vi.mocked(attemptRepo.listAttemptAnswers).mockResolvedValue([]);
    vi.mocked(attemptRepo.submitAttempt).mockResolvedValue({
      status: "ok",
      attempt: {
        ...baseAttemptState.attempt,
        status: "submitted",
        scoreRaw: 5,
        scorePercent: 100,
        correctCount: 2,
        xpEarned: 100,
      },
    });

    const result = await submitAttempt("user-1", "attempt-1", {
      answers: [
        { questionId: "q1", selectedOptionIds: ["opt-1"] },
        { questionId: "q2", textAnswer: "paris" },
      ],
      remainingSeconds: 400,
    });

    const call = vi.mocked(attemptRepo.submitAttempt).mock.calls[0]?.[0];
    expect(call?.scoreRaw).toBe(5);
    expect(call?.scorePercent).toBe(100);
    expect(call?.correctCount).toBe(2);
    expect(call?.xpEvent).toMatchObject({
      source: "attempt",
      amount: 100,
      metadata: { quizId: "quiz-1" },
    });
    expect(result.attempt.status).toBe("submitted");
  });

  it("accepts submit within grace window after expiry", async () => {
    const expiredAttempt = {
      ...baseAttemptRow,
      started_at: new Date(Date.now() - 62_000).toISOString(),
      time_limit_seconds: 60,
      remaining_seconds: 60,
    };
    vi.mocked(attemptRepo.getAttemptById).mockResolvedValue(expiredAttempt);
    vi.mocked(attemptRepo.listQuizGradingData).mockResolvedValue([
      {
        questionId: "q1",
        type: "mcq_single",
        defaultScore: 2,
        score: null,
        position: 1,
        optionIds: ["opt-1", "opt-2"],
        correctOptionIds: ["opt-1"],
        shortAnswerKeys: [],
      },
      {
        questionId: "q2",
        type: "short_answer",
        defaultScore: 3,
        score: null,
        position: 2,
        optionIds: [],
        correctOptionIds: [],
        shortAnswerKeys: [{ acceptableAnswer: "Paris", caseSensitive: false }],
      },
    ]);
    vi.mocked(attemptRepo.listAttemptAnswers).mockResolvedValue([]);
    vi.mocked(attemptRepo.submitAttempt).mockResolvedValue({
      status: "ok",
      attempt: {
        ...baseAttemptState.attempt,
        status: "submitted",
        scoreRaw: 5,
        scorePercent: 100,
        correctCount: 2,
        xpEarned: 100,
      },
    });

    await submitAttempt("user-1", "attempt-1", {
      answers: [
        { questionId: "q1", selectedOptionIds: ["opt-1"] },
        { questionId: "q2", textAnswer: "paris" },
      ],
      remainingSeconds: 0,
    });

    const call = vi.mocked(attemptRepo.submitAttempt).mock.calls[0]?.[0];
    expect(call?.scoreRaw).toBe(5);
    expect(call?.scorePercent).toBe(100);
    expect(call?.correctCount).toBe(2);
  });

  it("blocks double submit", async () => {
    vi.mocked(attemptRepo.getAttemptById).mockResolvedValue(baseAttemptRow);
    vi.mocked(attemptRepo.listQuizGradingData).mockResolvedValue([
      {
        questionId: "q1",
        type: "mcq_single",
        defaultScore: 1,
        score: null,
        position: 1,
        optionIds: ["opt-1"],
        correctOptionIds: ["opt-1"],
        shortAnswerKeys: [],
      },
    ]);
    vi.mocked(attemptRepo.listAttemptAnswers).mockResolvedValue([]);
    vi.mocked(attemptRepo.submitAttempt).mockResolvedValue({
      status: "already_submitted",
      attempt: {
        ...baseAttemptState.attempt,
        status: "submitted",
      },
    });

    await expect(
      submitAttempt("user-1", "attempt-1", {
        answers: [{ questionId: "q1", selectedOptionIds: ["opt-1"] }],
      }),
    ).rejects.toBeInstanceOf(ServiceError);
  });
});
