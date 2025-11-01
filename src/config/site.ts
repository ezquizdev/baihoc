export const siteConfig = {
  name: "BaiHoc",
  description:
    "BaiHoc is an online learning and exam-prep platform powered by quizzes, challenges, and an AI study companion.",
  url: "https://baihoc.app",
  ogImage: "/og.jpg",
  keywords: ["learning", "exam prep", "quizzes", "ai companion", "education"],
} as const;

export type SiteConfig = typeof siteConfig;
