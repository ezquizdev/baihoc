"use client";

type AddQuestionMessage = {
  type: "baihoc.quiz_builder.add_question";
  eventId: string;
  quizId: string;
  question: {
    id: string;
    stem: string;
    type: string;
    defaultScore: number;
  };
};

const MESSAGE_TYPE: AddQuestionMessage["type"] =
  "baihoc.quiz_builder.add_question";

function makeEventId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return (crypto as { randomUUID: () => string }).randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function channelName(quizId: string) {
  return `baihoc.quiz_builder:${quizId}`;
}

function storageKey(quizId: string) {
  return `baihoc.quiz_builder:add_question:${quizId}`;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function parseMessage(raw: unknown): AddQuestionMessage | null {
  if (!isObject(raw)) return null;
  if (raw.type !== MESSAGE_TYPE) return null;
  if (typeof raw.eventId !== "string") return null;
  if (typeof raw.quizId !== "string") return null;
  if (!isObject(raw.question)) return null;
  const question = raw.question;
  if (typeof question.id !== "string") return null;
  if (typeof question.stem !== "string") return null;
  if (typeof question.type !== "string") return null;
  if (typeof question.defaultScore !== "number") return null;
  return raw as AddQuestionMessage;
}

export type QuizBuilderAddQuestionPayload = Omit<
  AddQuestionMessage,
  "type" | "eventId"
>;

export function publishQuizBuilderAddQuestion(
  payload: QuizBuilderAddQuestionPayload,
) {
  const message: AddQuestionMessage = {
    ...payload,
    type: MESSAGE_TYPE,
    eventId: makeEventId(),
  };

  if (typeof BroadcastChannel !== "undefined") {
    try {
      const channel = new BroadcastChannel(channelName(payload.quizId));
      channel.postMessage(message);
      channel.close();
    } catch {
      // Ignore; we'll try localStorage as fallback.
    }
  }

  try {
    window.localStorage.setItem(
      storageKey(payload.quizId),
      JSON.stringify(message),
    );
  } catch {
    // Ignore storage errors (private mode / blocked).
  }
}

export function subscribeQuizBuilderAddQuestion(
  quizId: string,
  onMessage: (message: QuizBuilderAddQuestionPayload) => void,
) {
  const seen = new Set<string>();

  const handleRaw = (raw: unknown) => {
    const parsed = parseMessage(raw);
    if (!parsed) return;
    if (parsed.quizId !== quizId) return;
    if (seen.has(parsed.eventId)) return;
    seen.add(parsed.eventId);
    onMessage({ quizId: parsed.quizId, question: parsed.question });
  };

  let channel: BroadcastChannel | null = null;
  if (typeof BroadcastChannel !== "undefined") {
    try {
      channel = new BroadcastChannel(channelName(quizId));
      channel.addEventListener("message", (event) => handleRaw(event.data));
    } catch {
      channel = null;
    }
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key !== storageKey(quizId)) return;
    if (!event.newValue) return;
    try {
      handleRaw(JSON.parse(event.newValue));
    } catch {
      // Ignore invalid JSON.
    }
  };
  window.addEventListener("storage", handleStorage);

  return () => {
    channel?.close();
    window.removeEventListener("storage", handleStorage);
  };
}
