import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { generateCustomQuiz } from "@/application/services/customQuizService";

vi.mock("@/application/infra/db/userRepo", () => ({
  findUserById: vi.fn(),
}));

vi.mock("@/application/infra/db/customQuizRepo", () => ({
  createReadyCustomQuizWithGeneratedQuiz: vi.fn(),
  listEligibleQuestionsForCustomQuiz: vi.fn(),
  listTopicsByIds: vi.fn(),
}));

const userRepo = await import("@/application/infra/db/userRepo");
const customQuizRepo = await import("@/application/infra/db/customQuizRepo");

const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0);

beforeEach(() => {
  vi.clearAllMocks();
  randomSpy.mockReturnValue(0);
});

afterAll(() => {
  randomSpy.mockRestore();
});

describe("customQuizService", () => {
  it("rejects free-tier users", async () => {
    vi.mocked(userRepo.findUserById).mockResolvedValue({
      id: "user-1",
      email: "student@baihoc.dev",
      password_hash: null,
      full_name: "Student",
      school: null,
      date_of_birth: null,
      avatar_url: null,
      role: "student",
      tier: "free",
      status: "active",
      email_verified_at: null,
      oauth_provider: null,
      oauth_sub: null,
      profile_completed: true,
      last_login_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    await expect(
      generateCustomQuiz("user-1", {
        difficulty: 3,
        questionCount: 10,
        durationSeconds: 600,
        topicsBySubject: [
          {
            subjectId: "11111111-1111-1111-1111-111111111111",
            topicIds: ["aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"],
          },
        ],
      }),
    ).rejects.toMatchObject({ code: "PREMIUM_REQUIRED", status: 403 });
  });

  it("creates a custom quiz and generated quiz", async () => {
    vi.mocked(userRepo.findUserById).mockResolvedValue({
      id: "user-1",
      email: "student@baihoc.dev",
      password_hash: null,
      full_name: "Student",
      school: null,
      date_of_birth: null,
      avatar_url: null,
      role: "student",
      tier: "paid",
      status: "active",
      email_verified_at: null,
      oauth_provider: null,
      oauth_sub: null,
      profile_completed: true,
      last_login_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    vi.mocked(customQuizRepo.listTopicsByIds).mockResolvedValue([
      {
        id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        subject_id: "11111111-1111-1111-1111-111111111111",
        name: "Topic A",
        slug: "topic-a",
      },
      {
        id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
        subject_id: "11111111-1111-1111-1111-111111111111",
        name: "Topic B",
        slug: "topic-b",
      },
    ]);

    vi.mocked(
      customQuizRepo.listEligibleQuestionsForCustomQuiz,
    ).mockResolvedValue([
      // Topic B (expects more picks due to deterministic shuffle in tests)
      {
        id: "q-b1-1",
        difficulty: 1,
        passageId: null,
        passagePosition: null,
        topicIds: ["bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"],
      },
      {
        id: "q-b2-1",
        difficulty: 2,
        passageId: null,
        passagePosition: null,
        topicIds: ["bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"],
      },
      {
        id: "q-b2-2",
        difficulty: 2,
        passageId: null,
        passagePosition: null,
        topicIds: ["bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"],
      },
      {
        id: "q-b3-1",
        difficulty: 3,
        passageId: null,
        passagePosition: null,
        topicIds: ["bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"],
      },
      {
        id: "q-b3-2",
        difficulty: 3,
        passageId: null,
        passagePosition: null,
        topicIds: ["bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"],
      },
      {
        id: "q-b3-3",
        difficulty: 3,
        passageId: null,
        passagePosition: null,
        topicIds: ["bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"],
      },
      {
        id: "q-b4-1",
        difficulty: 4,
        passageId: null,
        passagePosition: null,
        topicIds: ["bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"],
      },
      {
        id: "q-b4-2",
        difficulty: 4,
        passageId: null,
        passagePosition: null,
        topicIds: ["bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"],
      },
      {
        id: "q-b4-3",
        difficulty: 4,
        passageId: null,
        passagePosition: null,
        topicIds: ["bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"],
      },
      {
        id: "q-b5-1",
        difficulty: 5,
        passageId: null,
        passagePosition: null,
        topicIds: ["bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"],
      },
      {
        id: "q-b5-2",
        difficulty: 5,
        passageId: null,
        passagePosition: null,
        topicIds: ["bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"],
      },
      {
        id: "q-b5-3",
        difficulty: 5,
        passageId: null,
        passagePosition: null,
        topicIds: ["bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"],
      },
      // Topic A
      {
        id: "q-a2-1",
        difficulty: 2,
        passageId: null,
        passagePosition: null,
        topicIds: ["aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"],
      },
      {
        id: "q-a3-1",
        difficulty: 3,
        passageId: null,
        passagePosition: null,
        topicIds: ["aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"],
      },
      {
        id: "q-a3-2",
        difficulty: 3,
        passageId: null,
        passagePosition: null,
        topicIds: ["aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"],
      },
      {
        id: "q-a4-1",
        difficulty: 4,
        passageId: null,
        passagePosition: null,
        topicIds: ["aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"],
      },
      {
        id: "q-a4-2",
        difficulty: 4,
        passageId: null,
        passagePosition: null,
        topicIds: ["aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"],
      },
      {
        id: "q-a4-3",
        difficulty: 4,
        passageId: null,
        passagePosition: null,
        topicIds: ["aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"],
      },
      {
        id: "q-a5-1",
        difficulty: 5,
        passageId: null,
        passagePosition: null,
        topicIds: ["aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"],
      },
      {
        id: "q-a5-2",
        difficulty: 5,
        passageId: null,
        passagePosition: null,
        topicIds: ["aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"],
      },
    ]);

    vi.mocked(
      customQuizRepo.createReadyCustomQuizWithGeneratedQuiz,
    ).mockResolvedValue({
      customQuizId: "custom-1",
      quizId: "quiz-1",
    });

    const result = await generateCustomQuiz("user-1", {
      difficulty: 4,
      questionCount: 20,
      durationSeconds: 900,
      topicsBySubject: [
        {
          subjectId: "11111111-1111-1111-1111-111111111111",
          topicIds: [
            "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
            "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
          ],
        },
      ],
    });

    expect(result).toEqual({ customQuizId: "custom-1", quizId: "quiz-1" });
    expect(
      customQuizRepo.createReadyCustomQuizWithGeneratedQuiz,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        difficulty: 4,
        questionIds: expect.any(Array),
      }),
    );
    const call = vi.mocked(
      customQuizRepo.createReadyCustomQuizWithGeneratedQuiz,
    ).mock.calls[0]?.[0];
    expect(call?.questionIds.length).toBe(20);
  });
});
