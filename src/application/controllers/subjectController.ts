import type { Subject } from "@/application/models/subject";
import { listAvailableSubjects } from "@/application/services/subjectService";

export async function controllerListSubjects(): Promise<Subject[]> {
  return listAvailableSubjects();
}
