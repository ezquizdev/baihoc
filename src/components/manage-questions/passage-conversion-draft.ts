import type { DifficultyLevel, QuestionType } from "@/application/models/enums";
import type {
  AnswerDraft,
  OptionDraft,
} from "@/components/manage-questions/question-draft";

export type PassageConversionDraftV1 = {
  version: 1;
  createdAt: string;
  sourceQuestionId: string;
  subjectId: string;
  type: QuestionType;
  defaultDifficulty: DifficultyLevel;
  defaultScore: number;
  stem: string;
  explanation: string;
  topicIds: string[];
  options: OptionDraft[];
  shortAnswers: AnswerDraft[];
  passagePosition: number;
};

const STORAGE_PREFIX = "baihoc:passage-conversion:";

export function makePassageConversionDraftId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return (crypto as { randomUUID: () => string }).randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function writePassageConversionDraft(
  draftId: string,
  draft: PassageConversionDraftV1,
) {
  sessionStorage.setItem(`${STORAGE_PREFIX}${draftId}`, JSON.stringify(draft));
}

export function readPassageConversionDraft(
  draftId: string,
): PassageConversionDraftV1 | null {
  const raw = sessionStorage.getItem(`${STORAGE_PREFIX}${draftId}`);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<PassageConversionDraftV1> | null;
    if (!parsed) return null;
    if (parsed.version !== 1) return null;
    if (!parsed.sourceQuestionId) return null;
    if (!parsed.subjectId) return null;
    if (!parsed.type) return null;
    if (!Number.isFinite(parsed.defaultDifficulty)) return null;
    if (!Number.isFinite(parsed.defaultScore)) return null;
    if (typeof parsed.stem !== "string") return null;
    if (typeof parsed.explanation !== "string") return null;
    if (!Array.isArray(parsed.topicIds)) return null;
    if (!Array.isArray(parsed.options)) return null;
    if (!Array.isArray(parsed.shortAnswers)) return null;
    if (!Number.isFinite(parsed.passagePosition)) return null;
    return parsed as PassageConversionDraftV1;
  } catch {
    return null;
  }
}

export function deletePassageConversionDraft(draftId: string) {
  sessionStorage.removeItem(`${STORAGE_PREFIX}${draftId}`);
}
