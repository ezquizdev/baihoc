import type { StaffHighlightChallengeSettingsDto } from "@/application/models/staffSettings";
import {
  getStaffHighlightChallengeSettings,
  setStaffHighlightChallengeSettings,
} from "@/application/services/staffSettingsService";

export async function controllerGetStaffHighlightChallengeSettings(): Promise<StaffHighlightChallengeSettingsDto> {
  return getStaffHighlightChallengeSettings();
}

export async function controllerSetStaffHighlightChallengeSettings(input: {
  staffUserId: string;
  quizId: string | null;
  questionId: string | null;
}) {
  return setStaffHighlightChallengeSettings(input);
}
