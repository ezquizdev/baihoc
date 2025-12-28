import type { AiEntryPoint } from "@/application/models/enums";
import {
  getAiChatSessionState,
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
