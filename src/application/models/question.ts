export type QuestionType =
  | "mcq_single"
  | "mcq_multi"
  | "short_answer"
  | "passage";
export type QuestionStatus = "active" | "archived";

export type Question = {
  id: string;
  subjectId: string;
  defaultDifficulty: "easy" | "medium" | "hard" | "mixed";
  type: QuestionType;
  stem: string;
  explanation: string | null;
  status: QuestionStatus;
  tags: string[];
  defaultScore: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
};

export type QuestionOption = {
  id: string;
  questionId: string;
  label: string | null;
  text: string;
  isCorrect: boolean;
  position: number;
};

export type ShortAnswerKey = {
  id: string;
  questionId: string;
  acceptableAnswer: string;
  caseSensitive: boolean;
};

export type Passage = {
  id: string;
  content: string;
  mediaUrls: string[];
};

export type QuestionDetail = {
  question: Question;
  options: QuestionOption[];
  shortAnswerKeys: ShortAnswerKey[];
  passage: Passage | null;
};
