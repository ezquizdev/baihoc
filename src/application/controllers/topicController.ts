import type { Topic } from "@/application/models/topic";
import { listAvailableTopics } from "@/application/services/topicService";

export async function controllerListTopics(
  input: { subjectIds?: string[] } = {},
): Promise<Topic[]> {
  return listAvailableTopics(input);
}
