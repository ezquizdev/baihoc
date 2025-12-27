import {
  autosaveAttempt,
  getAttemptState,
  listAttemptHistory,
  startOrResumeAttempt,
  submitAttempt,
} from "@/application/services/attemptService";

export async function controllerStartAttempt(userId: string, quizId: string) {
  return startOrResumeAttempt(userId, quizId);
}

export async function controllerGetAttemptState(
  userId: string,
  attemptId: string,
) {
  return getAttemptState(userId, attemptId);
}

export async function controllerListAttemptHistory(
  userId: string,
  params: { limit?: number; offset?: number } = {},
) {
  return listAttemptHistory(userId, params);
}

export async function controllerAutosaveAttempt(
  userId: string,
  attemptId: string,
  input: {
    answers: Array<{
      questionId: string;
      selectedOptionIds?: string[] | null;
      textAnswer?: string | null;
    }>;
    remainingSeconds?: number | null;
  },
) {
  return autosaveAttempt(userId, attemptId, input);
}

export async function controllerSubmitAttempt(
  userId: string,
  attemptId: string,
  input: {
    answers: Array<{
      questionId: string;
      selectedOptionIds?: string[] | null;
      textAnswer?: string | null;
    }>;
    remainingSeconds?: number | null;
  },
) {
  return submitAttempt(userId, attemptId, input);
}
