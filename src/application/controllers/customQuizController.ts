import type { GenerateCustomQuizInput } from "@/application/services/customQuizService";
import { generateCustomQuiz } from "@/application/services/customQuizService";

export async function controllerGenerateCustomQuiz(
  userId: string,
  input: GenerateCustomQuizInput,
) {
  return generateCustomQuiz(userId, input);
}
