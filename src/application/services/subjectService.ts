import { listSubjects } from "@/application/infra/db/subjectRepo";

export async function listAvailableSubjects() {
  return listSubjects();
}
