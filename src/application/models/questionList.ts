export const QuestionSortByValues = [
  "createdAt",
  "difficulty",
  "status",
  "stem",
  "subject",
  "type",
  "updatedAt",
] as const;

export type QuestionSortBy = (typeof QuestionSortByValues)[number];

export const QuestionSortDirValues = ["asc", "desc"] as const;

export type QuestionSortDir = (typeof QuestionSortDirValues)[number];
