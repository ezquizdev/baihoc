import { beforeEach, describe, expect, it, vi } from "vitest";
import { updateQuestion } from "@/application/services/questionService";

vi.mock("@/application/infra/db/questionRepo", () => ({
  archiveQuestion: vi.fn(),
  countQuestions: vi.fn(),
  deleteQuestion: vi.fn(),
  getQuestionDetail: vi.fn(),
  insertQuestion: vi.fn(),
  isQuestionUsed: vi.fn(),
  listQuestions: vi.fn(),
  updateQuestion: vi.fn(),
}));

const questionRepo = await import("@/application/infra/db/questionRepo");

const dummyDetail = {
  question: {
    id: "q1",
    subjectId: "00000000-0000-0000-0000-000000000000",
    defaultDifficulty: 3,
    type: "short_answer",
    stem: "Stem",
    explanation: null,
    status: "active",
    tags: [],
    topicIds: [],
    defaultScore: 1,
    createdBy: "u1",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    archivedAt: null,
    passageId: null,
    passagePosition: null,
  },
  options: [],
  shortAnswerKeys: [],
  passage: null,
} as const;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("questionService.updateQuestion", () => {
  it("preserves options=null when switching to short_answer", async () => {
    vi.mocked(questionRepo.updateQuestion).mockResolvedValue(dummyDetail);

    await updateQuestion("q1", {
      type: "short_answer",
      shortAnswers: [{ acceptableAnswer: "Paris", caseSensitive: false }],
      options: null,
    });

    const call = vi.mocked(questionRepo.updateQuestion).mock.calls[0]?.[0];
    expect(call?.options).toBeNull();
  });

  it("preserves passage=null to remove linkage", async () => {
    vi.mocked(questionRepo.updateQuestion).mockResolvedValue(dummyDetail);

    await updateQuestion("q1", { passage: null });

    const call = vi.mocked(questionRepo.updateQuestion).mock.calls[0]?.[0];
    expect(call?.passage).toBeNull();
  });

  it("rejects MCQ updates with options=null", async () => {
    await expect(
      updateQuestion("q1", {
        type: "mcq_single",
        options: null,
      }),
    ).rejects.toThrow(/Options are required for MCQ/);

    expect(questionRepo.updateQuestion).not.toHaveBeenCalled();
  });
});
