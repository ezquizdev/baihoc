export type StaffHighlightChallengeSettingsDto = {
  config: {
    quizId: string | null;
    questionId: string | null;
    quizTitle: string | null;
    questionStem: string | null;
    startAt: string | null;
    endAt: string | null;
    isActive: boolean;
    updatedAt: string;
    updatedByEmail: string | null;
  } | null;
  activeChallenges: Array<{
    quizId: string;
    quizTitle: string | null;
    startAt: string;
    endAt: string;
  }>;
};
