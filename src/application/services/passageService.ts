import {
  getPassageById,
  hasInProgressAttemptsForPassage,
  listQuestionsForPassage,
  updatePassageById,
} from "@/application/infra/db/questionRepo";
import { ServiceError } from "@/application/services/errors";

export async function getPassageDetail(passageId: string) {
  const [passage, questions] = await Promise.all([
    getPassageById(passageId),
    listQuestionsForPassage(passageId),
  ]);

  if (!passage) {
    throw new Error("Passage not found");
  }

  return { passage, questions };
}

export async function updatePassage(
  passageId: string,
  input: { content: string },
) {
  const inProgress = await hasInProgressAttemptsForPassage(passageId);
  if (inProgress) {
    throw new ServiceError(
      "PASSAGE_UPDATE_BLOCKED_IN_PROGRESS",
      "Đoạn văn đang nằm trong quiz có lượt làm đang diễn ra. Không thể chỉnh sửa nội dung.",
      409,
    );
  }
  if (!input.content.trim()) {
    throw new Error("Passage content is required");
  }

  const updated = await updatePassageById({
    passageId,
    content: input.content.trim(),
  });

  if (!updated) {
    throw new Error("Passage not found");
  }

  return updated;
}
