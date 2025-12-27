export type LeaderboardEntry = {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  xp: number;
};

export type LeaderboardRankedEntry = LeaderboardEntry & {
  rank: number;
};

export type LeaderboardResult = {
  items: LeaderboardRankedEntry[];
  self: LeaderboardRankedEntry | null;
};

export const LeaderboardSortByValues = [
  "vi",
  "en",
  "math",
  "sci",
  "overall",
] as const;

export type LeaderboardSortBy = (typeof LeaderboardSortByValues)[number];

export const LeaderboardSortDirValues = ["asc", "desc"] as const;

export type LeaderboardSortDir = (typeof LeaderboardSortDirValues)[number];

export type LeaderboardTableEntry = {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  rank: number;
  xpVi: number;
  xpEn: number;
  xpMath: number;
  xpSci: number;
  xpOverall: number;
};

export type LeaderboardTableResult = {
  items: LeaderboardTableEntry[];
  total: number;
  self: LeaderboardTableEntry | null;
};
