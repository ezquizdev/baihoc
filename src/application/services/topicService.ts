import { listTopics as listTopicsRepo } from "@/application/infra/db/topicRepo";

export async function listAvailableTopics(
  params: { subjectIds?: string[] } = {},
) {
  return listTopicsRepo(params);
}
