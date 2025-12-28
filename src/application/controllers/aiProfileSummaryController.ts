import {
  getAdminAiProfileSummaryState,
  getSelfAiProfileSummaryState,
  requestAdminAiProfileSummaryRegenerate,
  requestSelfAiProfileSummary,
} from "@/application/services/aiProfileSummaryService";

export async function controllerGetSelfAiProfileSummaryState(input: {
  userId: string;
}) {
  return getSelfAiProfileSummaryState(input.userId);
}

export async function controllerRequestSelfAiProfileSummary(input: {
  userId: string;
}) {
  return requestSelfAiProfileSummary(input.userId);
}

export async function controllerGetAdminAiProfileSummaryState(input: {
  userId: string;
}) {
  return getAdminAiProfileSummaryState(input);
}

export async function controllerRequestAdminAiProfileSummaryRegenerate(input: {
  actorUserId: string;
  userId: string;
}) {
  return requestAdminAiProfileSummaryRegenerate(input);
}
