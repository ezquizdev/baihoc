import {
  getPassageDetail,
  updatePassage,
} from "@/application/services/passageService";

export async function controllerGetPassageDetail(passageId: string) {
  return getPassageDetail(passageId);
}

export async function controllerUpdatePassage(
  passageId: string,
  input: { content: string; mediaUrls?: string[] },
) {
  const passage = await updatePassage(passageId, {
    content: input.content,
    mediaUrls: input.mediaUrls ?? [],
  });

  return { passage };
}
