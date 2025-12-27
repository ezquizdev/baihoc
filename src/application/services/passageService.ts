import {
  getPassageById,
  listQuestionsForPassage,
  updatePassageById,
} from "@/application/infra/db/questionRepo";

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
  input: { content: string; mediaUrls: string[] },
) {
  if (!input.content.trim()) {
    throw new Error("Passage content is required");
  }

  const mediaUrls = input.mediaUrls.map((url) => url.trim()).filter(Boolean);

  const updated = await updatePassageById({
    passageId,
    content: input.content.trim(),
    mediaUrls,
  });

  if (!updated) {
    throw new Error("Passage not found");
  }

  return updated;
}
