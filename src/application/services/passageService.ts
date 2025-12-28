import {
  deletePassageCascade,
  getPassageById,
  hasInProgressAttemptsForPassage,
  listQuestionsForPassage,
  listUsedQuestionIdsInQuizzes,
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
      "Đoạn ngữ liệu đang nằm trong quiz có lượt làm đang diễn ra. Không thể chỉnh sửa nội dung.",
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

export async function deletePassageWithQuestions(passageId: string) {
  const passage = await getPassageById(passageId);
  if (!passage) {
    throw new Error("Passage not found");
  }

  const inProgress = await hasInProgressAttemptsForPassage(passageId);
  if (inProgress) {
    throw new ServiceError(
      "PASSAGE_DELETE_BLOCKED_IN_PROGRESS",
      "Đoạn ngữ liệu đang nằm trong quiz có lượt làm đang diễn ra. Không thể xóa.",
      409,
    );
  }

  const questions = await listQuestionsForPassage(passageId);
  const questionIds = questions.map((q) => q.id);
  const usedIds = await listUsedQuestionIdsInQuizzes(questionIds);
  if (usedIds.length) {
    throw new ServiceError(
      "PASSAGE_DELETE_BLOCKED_IN_USE",
      "Không thể xóa passage vì có câu hỏi đang được dùng trong quiz. Hãy gỡ các câu hỏi này khỏi quiz trước.",
      409,
    );
  }

  await deletePassageCascade(passageId);
  return { status: "deleted" as const };
}
