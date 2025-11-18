"use client";

import { useEffect, useRef, useState } from "react";
import type { SessionPayload } from "@/application/infra/auth/session";
import type { DifficultyLabel } from "@/application/models/enums";
import type { LeaderboardEntry } from "@/application/models/leaderboard";
import type { QuizCatalogItem } from "@/application/models/quiz";
import type { Subject } from "@/application/models/subject";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import styles from "./quiz-catalog.module.css";
import { QuizFilters } from "./quiz-filters";
import { QuizGrid } from "./quiz-grid";
import { QuizHero } from "./quiz-hero";
import { QuizLeaderboard } from "./quiz-leaderboard";
import { QuizModal } from "./quiz-modal";
import { QuizPagination } from "./quiz-pagination";

type StatusFilter = "todo" | "done" | "all";
type SortOrder = "newest" | "oldest";

type QuizCatalogScreenProps = {
  session: SessionPayload;
  initialCatalog: { items: QuizCatalogItem[]; total: number };
  subjects: Subject[];
  leaderboard: LeaderboardEntry[];
};

const PAGE_SIZE = 12;
const RANGE_MIN = 0;
const RANGE_MAX = 50;

export function QuizCatalogScreen({
  session,
  initialCatalog,
  subjects,
  leaderboard,
}: QuizCatalogScreenProps) {
  const displayName = session.fullName ?? session.email.split("@")[0];
  const [status, setStatus] = useState<StatusFilter>("todo");
  const [sort, setSort] = useState<SortOrder>("newest");
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [selectedDifficulties, setSelectedDifficulties] = useState<
    DifficultyLabel[]
  >([]);
  const [minQuestions, setMinQuestions] = useState(RANGE_MIN);
  const [maxQuestions, setMaxQuestions] = useState(RANGE_MAX);
  const [minDuration, setMinDuration] = useState(RANGE_MIN);
  const [maxDuration, setMaxDuration] = useState(RANGE_MAX);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState(initialCatalog.items);
  const [total, setTotal] = useState(initialCatalog.total);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedQuiz, setSelectedQuiz] = useState<QuizCatalogItem | null>(
    null,
  );
  const initialLoadRef = useRef(true);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  useEffect(() => {
    if (page > totalPages) {
      setPage(1);
    }
  }, [page, totalPages]);

  useEffect(() => {
    if (initialLoadRef.current) {
      initialLoadRef.current = false;
      return;
    }
    void refreshKey;

    const controller = new AbortController();
    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        const params = new URLSearchParams();
        params.set("limit", String(PAGE_SIZE));
        params.set("offset", String((page - 1) * PAGE_SIZE));
        params.set("status", status);
        params.set("sort", sort);
        if (debouncedSearch.trim()) {
          params.set("search", debouncedSearch.trim());
        }
        if (selectedSubjectIds.length) {
          params.set("subjectIds", selectedSubjectIds.join(","));
        }
        if (selectedDifficulties.length) {
          params.set("difficultyLabels", selectedDifficulties.join(","));
        }
        if (minQuestions !== RANGE_MIN) {
          params.set("minQuestions", String(minQuestions));
        }
        if (maxQuestions !== RANGE_MAX) {
          params.set("maxQuestions", String(maxQuestions));
        }
        if (minDuration !== RANGE_MIN) {
          params.set("minDuration", String(minDuration));
        }
        if (maxDuration !== RANGE_MAX) {
          params.set("maxDuration", String(maxDuration));
        }

        const response = await fetch(`/api/catalog/quizzes?${params}`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          const payload = await response.json();
          throw new Error(payload?.error ?? "Không thể tải danh sách quiz");
        }
        const payload = await response.json();
        setItems(payload.items ?? []);
        setTotal(payload.total ?? 0);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Có lỗi xảy ra");
      } finally {
        setLoading(false);
      }
    };
    run();

    return () => controller.abort();
  }, [
    status,
    sort,
    selectedSubjectIds,
    selectedDifficulties,
    debouncedSearch,
    minQuestions,
    maxQuestions,
    minDuration,
    maxDuration,
    page,
    refreshKey,
  ]);

  const handleStatusChange = (next: StatusFilter) => {
    setStatus(next);
    setPage(1);
  };

  const handleSortChange = (next: SortOrder) => {
    setSort(next);
    setPage(1);
  };

  const toggleSubject = (subjectId: string) => {
    setSelectedSubjectIds((prev) => {
      const exists = prev.includes(subjectId);
      const next = exists
        ? prev.filter((id) => id !== subjectId)
        : [...prev, subjectId];
      return next;
    });
    setPage(1);
  };

  const toggleDifficulty = (difficulty: DifficultyLabel) => {
    setSelectedDifficulties((prev) => {
      const exists = prev.includes(difficulty);
      const next = exists
        ? prev.filter((id) => id !== difficulty)
        : [...prev, difficulty];
      return next;
    });
    setPage(1);
  };

  const handleQuestionRange = (min: number, max: number) => {
    setMinQuestions(min);
    setMaxQuestions(max);
    setPage(1);
  };

  const handleDurationRange = (min: number, max: number) => {
    setMinDuration(min);
    setMaxDuration(max);
    setPage(1);
  };

  const handleRetry = () => {
    setError(null);
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <DashboardShell
      activeNav="quizzes"
      userEmail={session.email}
      userName={displayName}
      avatarUrl={session.avatarUrl}
      searchValue={search}
      onSearchChange={(value) => {
        setSearch(value);
        setPage(1);
      }}
      onSearchSubmit={(value) => {
        setSearch(value);
        setPage(1);
      }}
      searchPlaceholder="Tìm quiz"
    >
      <div className={styles.page}>
        <QuizHero />
        <QuizFilters
          status={status}
          onStatusChange={handleStatusChange}
          sort={sort}
          onSortChange={handleSortChange}
          subjects={subjects}
          selectedSubjectIds={selectedSubjectIds}
          onSubjectToggle={toggleSubject}
          selectedDifficulties={selectedDifficulties}
          onDifficultyToggle={toggleDifficulty}
          minQuestions={minQuestions}
          maxQuestions={maxQuestions}
          onQuestionRangeChange={handleQuestionRange}
          minDuration={minDuration}
          maxDuration={maxDuration}
          onDurationRangeChange={handleDurationRange}
        />

        <section className={styles.catalog} aria-label="Catalog">
          <div>
            <QuizGrid
              items={items}
              isLoading={loading}
              error={error}
              onRetry={handleRetry}
              onSelect={setSelectedQuiz}
            />
            <QuizPagination
              page={page}
              totalItems={total}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
            />
          </div>
          <QuizLeaderboard items={leaderboard} />
        </section>
      </div>
      <QuizModal quiz={selectedQuiz} onClose={() => setSelectedQuiz(null)} />
    </DashboardShell>
  );
}

function useDebouncedValue<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}
