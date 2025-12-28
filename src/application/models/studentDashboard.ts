export type StudentDashboardDailyChallengeCardDto =
  | { status: "none" }
  | {
      status: "active";
      quizId: string;
      quizTitle: string | null;
      question: string;
      answers: string[];
      actionLabel: string;
      actionHref?: string;
    };
