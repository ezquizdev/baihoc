"use client";

import type { QuizCatalogItem } from "@/application/models/quiz";
import styles from "./quiz-catalog.module.css";

type DifficultyConfig = {
  label: string;
  stars: number;
  className: string;
};

const difficultyMap: Record<QuizCatalogItem["difficulty"], DifficultyConfig> = {
  easy: { label: "Dễ", stars: 2, className: styles.difficultyEasy },
  medium: { label: "Trung bình", stars: 3, className: styles.difficultyMedium },
  hard: { label: "Khó", stars: 5, className: styles.difficultyHard },
  mixed: { label: "Tổng hợp", stars: 4, className: styles.difficultyMixed },
};

export function DifficultyBadge({
  difficulty,
  className,
}: {
  difficulty: QuizCatalogItem["difficulty"];
  className?: string;
}) {
  const config = difficultyMap[difficulty];
  return (
    <div
      className={`${styles.difficultyBadge} ${config.className} ${
        className ?? ""
      }`.trim()}
      aria-label={`Độ khó ${config.label}`}
    >
      <span className={styles.difficultyLabel}>{config.label}</span>
      <span className={styles.difficultyStars}>
        {"★".repeat(config.stars)}
      </span>
    </div>
  );
}

export function SubjectBadge({
  name,
  slug,
  className,
}: {
  name: string;
  slug: string;
  className?: string;
}) {
  const toneClass = subjectToneClass(slug);
  return (
    <span
      className={`${styles.subjectBadge} ${toneClass} ${className ?? ""}`.trim()}
      aria-label={`Môn ${name}`}
    >
      <span className={styles.subjectChip} aria-hidden="true" />
      {name}
    </span>
  );
}

export function subjectToneClass(slug: string) {
  const normalized = slug.toLowerCase();
  if (normalized.includes("en")) return styles.subjectEn;
  if (normalized.includes("math")) return styles.subjectMath;
  if (normalized.includes("sci")) return styles.subjectSci;
  if (normalized.includes("vi")) return styles.subjectVi;
  return "";
}
