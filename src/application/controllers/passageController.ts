import {
  createPassage,
  deletePassageWithQuestions,
  getPassageDetail,
  updatePassage,
} from "@/application/services/passageService";

export async function controllerCreatePassage(input?: { content?: string }) {
  const passage = await createPassage(input);
  return { passage };
}

export async function controllerGetPassageDetail(passageId: string) {
  return getPassageDetail(passageId);
}

export async function controllerUpdatePassage(
  passageId: string,
  input: { content: string },
) {
  const passage = await updatePassage(passageId, {
    content: input.content,
  });

  return { passage };
}

export async function controllerDeletePassage(passageId: string) {
  return deletePassageWithQuestions(passageId);
}
