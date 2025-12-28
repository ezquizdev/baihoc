import type { AiEntryPoint } from "@/application/models/enums";
import {
  createAiChatSession,
  getAiChatConversation,
  getAiChatSessionState,
  listAiChatSessions,
  sendAiChatMessage,
} from "@/application/services/aiChatService";

export async function controllerGetAiChatSessionState(input: {
  userId: string;
  entryPoint: AiEntryPoint;
  attemptId?: string | null;
  questionId?: string | null;
  sessionId?: string | null;
}) {
  return getAiChatSessionState(input);
}

export async function controllerSendAiChatMessage(input: {
  userId: string;
  entryPoint: AiEntryPoint;
  attemptId?: string | null;
  questionId?: string | null;
  sessionId?: string | null;
  message: string;
}) {
  return sendAiChatMessage(input);
}

export async function controllerListAiChatSessions(input: {
  userId: string;
  limit?: number;
  offset?: number;
}) {
  return listAiChatSessions(input.userId, {
    limit: input.limit,
    offset: input.offset,
  });
}

export async function controllerGetAiChatConversation(input: {
  userId: string;
  sessionId: string;
}) {
  return getAiChatConversation(input);
}

export async function controllerCreateAiChatSession(input: {
  userId: string;
  entryPoint: AiEntryPoint;
  attemptId?: string | null;
  questionId?: string | null;
}) {
  return createAiChatSession(input);
}
