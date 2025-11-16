"use client";

import type { QuizCatalogItem } from "@/application/models/quiz";
import styles from "./quiz-catalog.module.css";

type DifficultyConfig = {
  label: string;
  stars: number;
  className: string;
};

function difficultyConfig(
  level: QuizCatalogItem["difficulty"],
): DifficultyConfig | null {
  if (!Number.isFinite(level)) return null;
  const safeLevel = Math.min(Math.max(Math.round(level), 1), 5);
  if (safeLevel <= 2) {
    return { label: "Dễ", stars: safeLevel, className: styles.difficultyEasy };
  }
  if (safeLevel <= 4) {
    return {
      label: "Trung bình",
      stars: safeLevel,
      className: styles.difficultyMedium,
    };
  }
  return { label: "Khó", stars: safeLevel, className: styles.difficultyHard };
}

export function DifficultyBadge({
  difficulty,
  className,
}: {
  difficulty: QuizCatalogItem["difficulty"];
  className?: string;
}) {
  const config = difficultyConfig(difficulty);
  if (!config) return null;
  return (
    <div
      className={`${styles.difficultyBadge} ${config.className} ${
        className ?? ""
      }`.trim()}
      aria-label={`Độ khó ${config.label}`}
    >
      <span className={styles.difficultyLabel}>{config.label}</span>
      <span className={styles.difficultyStars}>{config.stars}★</span>
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
      <span className={styles.subjectText}>{name}</span>
    </span>
  );
}

export function subjectToneClass(slug: string) {
  const normalized = slug.toLowerCase();
  if (normalized.includes("mixed")) return styles.subjectMixed;
  if (normalized.includes("en")) return styles.subjectEn;
  if (normalized.includes("math")) return styles.subjectMath;
  if (normalized.includes("sci")) return styles.subjectSci;
  if (normalized.includes("vi")) return styles.subjectVi;
  return "";
}
