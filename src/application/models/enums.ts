export const DifficultyLevelValues = [1, 2, 3, 4, 5] as const;
export type DifficultyLevel = (typeof DifficultyLevelValues)[number];

export const DifficultyLabelValues = ["easy", "medium", "hard"] as const;
export type DifficultyLabel = (typeof DifficultyLabelValues)[number];

export const QuizVisibilityValues = ["free", "premium"] as const;
export type QuizVisibility = (typeof QuizVisibilityValues)[number];

export const QuizStatusValues = ["draft", "published", "archived"] as const;
export type QuizStatus = (typeof QuizStatusValues)[number];

export const QuestionTypeValues = [
  "mcq_single",
  "mcq_multi",
  "short_answer",
] as const;
export type QuestionType = (typeof QuestionTypeValues)[number];

export const QuestionStatusValues = ["active", "archived"] as const;
export type QuestionStatus = (typeof QuestionStatusValues)[number];
