export const AiProfileSummaryStatusValues = [
  "pending",
  "processing",
  "failed",
  "completed",
] as const;

export type AiProfileSummaryStatus =
  (typeof AiProfileSummaryStatusValues)[number];

export type AiProfileSummaryDto = {
  status: AiProfileSummaryStatus;
  summaryMarkdown: string | null;
  errorMessage: string | null;
  requestedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  updatedAt: string;
};
