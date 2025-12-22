import type { LinkProps } from "next/link";

export type StaffNavKey =
  | "overview"
  | "quizzes"
  | "questions"
  | "students"
  | "leaderboard"
  | "analytics"
  | "profile"
  | "settings";

type NavHref = LinkProps<string>["href"];

export const staffNavItems: Array<{
  key: StaffNavKey;
  label: string;
  href: NavHref;
}> = [
  { key: "overview", label: "Tổng quan", href: "/staff/dashboard" },
  { key: "quizzes", label: "Tất cả quiz", href: "/staff/quizzes" },
  { key: "questions", label: "Kho câu hỏi", href: "/staff/questions" },
  { key: "students", label: "Quản lý học sinh", href: "/staff/students" },
  { key: "leaderboard", label: "Bảng xếp hạng", href: "/staff/leaderboard" },
  { key: "analytics", label: "Phân tích thống kê", href: "/staff/analytics" },
  { key: "profile", label: "Hồ sơ", href: "/profile" },
  { key: "settings", label: "Cài đặt", href: "/staff/settings" },
];
