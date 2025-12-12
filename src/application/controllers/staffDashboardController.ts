import type { StaffDashboardOverviewDto } from "@/application/models/staffDashboard";
import type { Subject } from "@/application/models/subject";
import { getStaffDashboardOverview } from "@/application/services/staffDashboardService";

export async function controllerGetStaffDashboardOverview(input: {
  leaderboardLimit: number;
  activityLimit: number;
  subjects: Subject[];
}): Promise<StaffDashboardOverviewDto> {
  return getStaffDashboardOverview(input);
}
