import type { StaffDashboardOverviewDto } from "@/application/models/staffDashboard";
import type { Subject } from "@/application/models/subject";
import {
  getStaffDashboardActivitySection,
  getStaffDashboardChartsSection,
  getStaffDashboardCompetencySection,
  getStaffDashboardLeaderboardSection,
  getStaffDashboardOverview,
  getStaffDashboardStatsSection,
} from "@/application/services/staffDashboardService";

export async function controllerGetStaffDashboardOverview(input: {
  leaderboardLimit: number;
  activityLimit: number;
  subjects: Subject[];
}): Promise<StaffDashboardOverviewDto> {
  return getStaffDashboardOverview(input);
}

export async function controllerGetStaffDashboardStats() {
  return getStaffDashboardStatsSection();
}

export async function controllerGetStaffDashboardActivity(input: {
  limit: number;
}) {
  return getStaffDashboardActivitySection(input.limit);
}

export async function controllerGetStaffDashboardLeaderboard(input: {
  limit: number;
}) {
  return getStaffDashboardLeaderboardSection(input.limit);
}

export async function controllerGetStaffDashboardCompetency(input: {
  subjects: Subject[];
}) {
  return getStaffDashboardCompetencySection(input.subjects);
}

export async function controllerGetStaffDashboardCharts(input: {
  windowDays: number;
}) {
  return getStaffDashboardChartsSection(input.windowDays);
}
