"use client";

import type { QuizCatalogItem } from "@/application/models/quiz";
import styles from "./quiz-catalog.module.css";
import { getSubjectTone, isMixedSubject } from "./subject-tone";

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
    return { label: "Nhẹ", stars: safeLevel, className: styles.difficultyEasy };
  }
  if (safeLevel <= 4) {
    return {
      label: "Vừa",
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
      role="img"
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
  const tone = getSubjectTone(slug);
  const toneClass = isMixedSubject(slug)
    ? styles.subjectMixed
    : subjectToneClass(tone);
  return (
    <span
      className={`${styles.subjectBadge} ${toneClass} ${className ?? ""}`.trim()}
      role="img"
      aria-label={`Môn ${name}`}
    >
      <span className={styles.subjectChip} aria-hidden="true" />
      <span className={styles.subjectText}>{name}</span>
    </span>
  );
}

function subjectToneClass(tone: ReturnType<typeof getSubjectTone>) {
  switch (tone) {
    case "en":
      return styles.subjectEn;
    case "math":
      return styles.subjectMath;
    case "sci":
      return styles.subjectSci;
    case "vi":
      return styles.subjectVi;
    default:
      return "";
  }
}
