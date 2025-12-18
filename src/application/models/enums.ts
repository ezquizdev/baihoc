export const DifficultyValues = ["easy", "medium", "hard", "mixed"] as const;
export type DifficultyLevel = (typeof DifficultyValues)[number];

export const QuizVisibilityValues = ["free", "premium"] as const;
export type QuizVisibility = (typeof QuizVisibilityValues)[number];

export const QuizStatusValues = ["draft", "published", "archived"] as const;
export type QuizStatus = (typeof QuizStatusValues)[number];

export const QuestionTypeValues = [
  "mcq_single",
  "mcq_multi",
  "short_answer",
  "passage",
] as const;
export type QuestionType = (typeof QuestionTypeValues)[number];

export const QuestionStatusValues = ["active", "archived"] as const;
export type QuestionStatus = (typeof QuestionStatusValues)[number];
