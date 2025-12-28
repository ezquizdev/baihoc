import type { QuestionDetail } from "@/application/models/question";

export type OptionDraft = {
  label: string | null;
  text: string;
  isCorrect: boolean;
  position: number;
};

export type AnswerDraft = {
  clientId: string;
  acceptableAnswer: string;
  caseSensitive: boolean;
};

export function buildDefaultMcqOptions(): OptionDraft[] {
  return [
    { label: null, text: "", isCorrect: false, position: 1 },
    { label: null, text: "", isCorrect: false, position: 2 },
    { label: null, text: "", isCorrect: false, position: 3 },
    { label: null, text: "", isCorrect: false, position: 4 },
  ];
}

export function normalizeOptionDrafts(
  options: QuestionDetail["options"],
): OptionDraft[] {
  const sorted = [...(options ?? [])].sort((a, b) => a.position - b.position);
  if (!sorted.length) return buildDefaultMcqOptions();
  return sorted.map((o) => ({
    label: o.label ?? null,
    text: o.text ?? "",
    isCorrect: Boolean(o.isCorrect),
    position: o.position,
  }));
}

export function normalizeShortAnswerDrafts(
  keys: QuestionDetail["shortAnswerKeys"],
): AnswerDraft[] {
  const sorted = [...(keys ?? [])].map((k) => ({
    clientId: k.id,
    acceptableAnswer: k.acceptableAnswer ?? "",
    caseSensitive: Boolean(k.caseSensitive),
  }));
  return sorted.length ? sorted : [buildEmptyShortAnswer()];
}

export function normalizeOptionsForPayload(options: OptionDraft[]) {
  const normalized = options
    .slice()
    .map((o, idx) => ({
      label: o.label ?? null,
      text: o.text.trim(),
      isCorrect: Boolean(o.isCorrect),
      position: idx + 1,
    }))
    .filter((o) => o.text);
  return normalized;
}

export function buildEmptyShortAnswer(): AnswerDraft {
  return {
    clientId: makeClientId(),
    acceptableAnswer: "",
    caseSensitive: false,
  };
}

export function makeClientId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return (crypto as { randomUUID: () => string }).randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
