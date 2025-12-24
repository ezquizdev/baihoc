import type {
  DifficultyLabel,
  DifficultyLevel,
} from "@/application/models/enums";

const labelToLevels: Record<DifficultyLabel, DifficultyLevel[]> = {
  easy: [1, 2],
  medium: [3, 4],
  hard: [5],
};

export function mapDifficultyLabelsToLevels(
  labels?: DifficultyLabel[],
): DifficultyLevel[] | undefined {
  if (!labels?.length) return undefined;
  const levels = new Set<DifficultyLevel>();
  labels.forEach((label) => {
    const mapped = labelToLevels[label];
    mapped.forEach((level) => {
      levels.add(level);
    });
  });
  return levels.size ? Array.from(levels) : undefined;
}
