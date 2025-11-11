import {
  type DifficultyLevel,
  DifficultyValues,
  type QuestionStatus,
  QuestionStatusValues,
  type QuestionType,
  QuestionTypeValues,
  type QuizStatus,
  QuizStatusValues,
  type QuizVisibility,
  QuizVisibilityValues,
} from "@/application/models/enums";

export function parsePagination(
  searchParams: URLSearchParams,
  defaults: { limit?: number; offset?: number } = {},
  maxLimit = 100,
) {
  const limit = clampNumber(
    searchParams.get("limit"),
    defaults.limit ?? 20,
    1,
    maxLimit,
  );
  const offset = clampNumber(
    searchParams.get("offset"),
    defaults.offset ?? 0,
    0,
    Number.MAX_SAFE_INTEGER,
  );
  return { limit, offset };
}

export function parseCommaIds(searchParams: URLSearchParams, key: string) {
  const raw = searchParams.get(key);
  if (!raw) return undefined;
  const ids = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return ids.length ? ids : undefined;
}

export function parseEnumArray<T extends string>(
  searchParams: URLSearchParams,
  key: string,
  allowed: readonly T[],
) {
  const raw = searchParams.get(key);
  if (!raw) return undefined;
  const values = raw
    .split(",")
    .map((s) => s.trim())
    .filter((value) => allowed.includes(value as T)) as T[];
  return values.length ? values : undefined;
}

export function parseNumberRange(
  searchParams: URLSearchParams,
  minKey: string,
  maxKey: string,
) {
  const min = parseFiniteNumber(searchParams.get(minKey));
  const max = parseFiniteNumber(searchParams.get(maxKey));
  if (min !== undefined && max !== undefined && min > max) {
    return { min: max, max: min };
  }
  return { min, max };
}

export function parseDifficulty(searchParams: URLSearchParams) {
  return parseEnum<DifficultyLevel>(
    searchParams.get("difficulty"),
    DifficultyValues,
  );
}

export function parseQuizVisibility(searchParams: URLSearchParams) {
  return parseEnum<QuizVisibility>(
    searchParams.get("visibility"),
    QuizVisibilityValues,
  );
}

export function parseQuizStatus(searchParams: URLSearchParams) {
  return parseEnum<QuizStatus>(searchParams.get("status"), QuizStatusValues);
}

export function parseQuestionStatus(searchParams: URLSearchParams) {
  return parseEnum<QuestionStatus>(
    searchParams.get("status"),
    QuestionStatusValues,
  );
}

export function parseQuestionType(searchParams: URLSearchParams) {
  return parseEnum<QuestionType>(searchParams.get("type"), QuestionTypeValues);
}

export function parseNumber(searchParams: URLSearchParams, key: string) {
  return parseFiniteNumber(searchParams.get(key));
}

function parseEnum<T extends string>(
  value: string | null,
  allowed: readonly T[],
) {
  if (!value) return undefined;
  return allowed.includes(value as T) ? (value as T) : undefined;
}

function parseFiniteNumber(value: string | null) {
  if (!value) return undefined;
  const num = Number(value);
  if (!Number.isFinite(num)) return undefined;
  return num;
}

function clampNumber(
  raw: string | null,
  fallback: number,
  min: number,
  max: number,
) {
  const parsed = parseFiniteNumber(raw);
  if (parsed === undefined) return fallback;
  return Math.min(Math.max(parsed, min), max);
}
