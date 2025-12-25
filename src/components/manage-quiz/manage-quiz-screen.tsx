"use client";

import { useEffect, useMemo, useState } from "react";
import type { SessionPayload } from "@/application/infra/auth/session";
import type { DifficultyLevel } from "@/application/models/enums";
import type { LeaderboardEntry } from "@/application/models/leaderboard";
import type { QuizListItem } from "@/application/models/quiz";
import type { Subject } from "@/application/models/subject";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { QuizLeaderboard } from "@/components/quiz-catalog/quiz-leaderboard";
import { QuizPagination } from "@/components/quiz-catalog/quiz-pagination";
import { ManageQuizFilters } from "./manage-quiz-filters";
import styles from "./manage-quiz-screen.module.css";
import { CreateQuizModal } from "./modals/create-quiz-modal";
import { QuestionEditModal } from "./modals/question-edit-modal";
import { QuizBuilderModal } from "./modals/quiz-builder-modal";
import { QuizInfoModal } from "./modals/quiz-info-modal";
import { StaffQuizGrid } from "./staff-quiz-grid";

type SortOrder = "newest" | "oldest";
type StatusFilter = "active" | "draft" | "published" | "all";

type ManageQuizScreenProps = {
  session: SessionPayload;
  initialQuizzes: QuizListItem[];
  initialLimit: number;
  subjects: Subject[];
  leaderboard: LeaderboardEntry[];
};

const PAGE_SIZE = 9;
const RANGE_MIN = 0;
const RANGE_MAX_INITIAL = 50;

const staffNavItems = [
  { key: "overview", label: "Tổng quan" },
  { key: "quizzes", label: "Tất cả quiz", href: "/staff/quizzes" },
  { key: "question-bank", label: "Kho câu hỏi", href: "/staff/questions" },
  { key: "students", label: "Quản lý học sinh" },
  { key: "leaderboard", label: "Bảng xếp hạng" },
  { key: "analytics", label: "Phân tích thống kê" },
  { key: "settings", label: "Cài đặt" },
];

export function ManageQuizScreen({
  session,
  initialQuizzes,
  initialLimit,
  subjects,
  leaderboard,
}: ManageQuizScreenProps) {
  const displayName = session.fullName ?? session.email.split("@")[0];
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [sort, setSort] = useState<SortOrder>("newest");
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [selectedDifficulties, setSelectedDifficulties] = useState<
    DifficultyLevel[]
  >([]);
  const [minQuestions, setMinQuestions] = useState(RANGE_MIN);
  const [maxQuestions, setMaxQuestions] = useState(RANGE_MAX_INITIAL);
  const [minDuration, setMinDuration] = useState(RANGE_MIN);
  const [maxDuration, setMaxDuration] = useState(RANGE_MAX_INITIAL);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [page, setPage] = useState(1);
  const [allQuizzes, setAllQuizzes] = useState<QuizListItem[]>(initialQuizzes);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [infoQuizId, setInfoQuizId] = useState<string | null>(null);
  const [builderQuizId, setBuilderQuizId] = useState<string | null>(null);
  const [builderRefreshKey, setBuilderRefreshKey] = useState(0);
  const [questionTarget, setQuestionTarget] = useState<{
    quizId: string;
    questionId: string;
    position: number;
  } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const run = async () => {
      try {
        setLoading(true);
        setError(null);

        const limit = 100;
        const shouldSkipFetchMore =
          refreshKey === 0 &&
          initialQuizzes.length > 0 &&
          initialQuizzes.length < initialLimit;
        if (shouldSkipFetchMore) {
          setAllQuizzes(initialQuizzes);
          return;
        }

        let offset = refreshKey === 0 ? initialQuizzes.length : 0;
        let acc = refreshKey === 0 ? [...initialQuizzes] : [];

        while (true) {
          const params = new URLSearchParams();
          params.set("limit", String(limit));
          params.set("offset", String(offset));
          const response = await fetch(`/api/staff/quizzes?${params}`, {
            signal: controller.signal,
          });
          if (!response.ok) {
            const payload = await response.json().catch(() => ({}));
            throw new Error(payload?.error ?? "Không thể tải danh sách quiz");
          }
          const payload = await response.json();
          const items = Array.isArray(payload.items) ? payload.items : [];
          acc = [...acc, ...(items as QuizListItem[])];
          if (items.length < limit) break;
          offset += limit;
        }

        setAllQuizzes(acc);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Không thể tải quiz");
      } finally {
        setLoading(false);
      }
    };

    run();
    return () => controller.abort();
  }, [initialLimit, initialQuizzes, refreshKey]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (document.body.dataset.dndDragging === "true") return;
      if (createOpen) {
        setCreateOpen(false);
        return;
      }
      if (questionTarget) {
        setQuestionTarget(null);
        return;
      }
      if (builderQuizId) {
        setBuilderQuizId(null);
        return;
      }
      if (infoQuizId) {
        setInfoQuizId(null);
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [builderQuizId, createOpen, infoQuizId, questionTarget]);

  useEffect(() => {
    const open = Boolean(
      createOpen || infoQuizId || builderQuizId || questionTarget,
    );
    document.body.classList.toggle("modal-open", open);
    return () => document.body.classList.remove("modal-open");
  }, [builderQuizId, createOpen, infoQuizId, questionTarget]);

  const questionMaxLimit = useMemo(() => {
    let max = RANGE_MAX_INITIAL;
    for (const quiz of allQuizzes) {
      const count = quiz.questionCount ?? 0;
      if (count > max) max = count;
    }
    return Math.max(max, maxQuestions);
  }, [allQuizzes, maxQuestions]);

  const durationMaxLimit = useMemo(() => {
    let max = RANGE_MAX_INITIAL;
    for (const quiz of allQuizzes) {
      const minutes = quiz.estimatedTimeSeconds
        ? Math.round(quiz.estimatedTimeSeconds / 60)
        : 0;
      if (minutes > max) max = minutes;
    }
    return Math.max(max, maxDuration);
  }, [allQuizzes, maxDuration]);

  useEffect(() => {
    setMaxQuestions((prev) =>
      prev === RANGE_MAX_INITIAL ? questionMaxLimit : prev,
    );
  }, [questionMaxLimit]);

  useEffect(() => {
    setMaxDuration((prev) =>
      prev === RANGE_MAX_INITIAL ? durationMaxLimit : prev,
    );
  }, [durationMaxLimit]);

  const filtered = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase();
    let out = allQuizzes.filter((quiz) => quiz.status !== "archived");

    if (statusFilter === "active") {
      out = out.filter((quiz) => quiz.status !== "archived");
    } else if (statusFilter === "draft") {
      out = out.filter((quiz) => quiz.status === "draft");
    } else if (statusFilter === "published") {
      out = out.filter((quiz) => quiz.status === "published");
    }

    if (query) {
      out = out.filter((quiz) => quiz.title.toLowerCase().includes(query));
    }

    if (selectedSubjectIds.length) {
      out = out.filter((quiz) =>
        quiz.subjectIds.some((id) => selectedSubjectIds.includes(id)),
      );
    }

    if (selectedDifficulties.length) {
      out = out.filter((quiz) =>
        selectedDifficulties.includes(quiz.difficulty),
      );
    }

    out = out.filter((quiz) => {
      const count = quiz.questionCount ?? 0;
      return count >= minQuestions && count <= maxQuestions;
    });

    out = out.filter((quiz) => {
      const minutes = quiz.estimatedTimeSeconds
        ? Math.round(quiz.estimatedTimeSeconds / 60)
        : 0;
      return minutes >= minDuration && minutes <= maxDuration;
    });

    out = out.slice().sort((a, b) => {
      const aDate = Date.parse(a.updatedAt ?? a.createdAt);
      const bDate = Date.parse(b.updatedAt ?? b.createdAt);
      const aSafe = Number.isFinite(aDate) ? aDate : 0;
      const bSafe = Number.isFinite(bDate) ? bDate : 0;
      return sort === "newest" ? bSafe - aSafe : aSafe - bSafe;
    });

    return out;
  }, [
    allQuizzes,
    debouncedSearch,
    maxDuration,
    maxQuestions,
    minDuration,
    minQuestions,
    selectedDifficulties,
    selectedSubjectIds,
    statusFilter,
    sort,
  ]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  useEffect(() => {
    if (page > totalPages) {
      setPage(1);
    }
  }, [page, totalPages]);

  const pagedItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const handleRetry = () => {
    setError(null);
    setRefreshKey((prev) => prev + 1);
  };

  const handleSortChange = (next: SortOrder) => {
    setSort(next);
    setPage(1);
  };

  const toggleSubject = (subjectId: string) => {
    setSelectedSubjectIds((prev) => {
      const exists = prev.includes(subjectId);
      return exists
        ? prev.filter((id) => id !== subjectId)
        : [...prev, subjectId];
    });
    setPage(1);
  };

  const toggleDifficulty = (difficulty: DifficultyLevel) => {
    setSelectedDifficulties((prev) => {
      const exists = prev.includes(difficulty);
      return exists
        ? prev.filter((level) => level !== difficulty)
        : [...prev, difficulty];
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

  const handleMutated = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <DashboardShell
      activeNav="quizzes"
      navItems={staffNavItems}
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
        <section
          className={`cardBase ${styles.hero}`}
          aria-label="Manage quiz hero"
        >
          <div>
            <h1 className={styles.heroTitle}>
              <span>Danh sách</span>Quiz
            </h1>
            <p className={styles.heroText}>
              Quản lý quiz: chỉnh sửa, xóa, đăng / lưu nháp và cập nhật câu hỏi.
            </p>
          </div>
          <div className={styles.heroRight}>
            <button
              type="button"
              className={styles.heroCta}
              onClick={() => setCreateOpen(true)}
            >
              + Tạo quiz
            </button>
            <div className={styles.heroFigure} aria-hidden="true">
              <div className={styles.heroHead} />
              <div className={styles.heroArm} />
              <div className={styles.heroBody} />
            </div>
          </div>
        </section>

        <ManageQuizFilters
          statusFilter={statusFilter}
          onStatusFilterChange={(next) => {
            setStatusFilter(next);
            setPage(1);
          }}
          sort={sort}
          onSortChange={handleSortChange}
          subjects={subjects}
          selectedSubjectIds={selectedSubjectIds}
          onSubjectToggle={toggleSubject}
          selectedDifficulties={selectedDifficulties}
          onDifficultyToggle={toggleDifficulty}
          minQuestions={minQuestions}
          maxQuestions={maxQuestions}
          questionMaxLimit={questionMaxLimit}
          onQuestionRangeChange={handleQuestionRange}
          minDuration={minDuration}
          maxDuration={maxDuration}
          durationMaxLimit={durationMaxLimit}
          onDurationRangeChange={handleDurationRange}
        />

        <section className={styles.catalog} aria-label="Catalog">
          <div>
            <StaffQuizGrid
              items={pagedItems}
              subjects={subjects}
              isLoading={loading}
              error={error}
              onRetry={handleRetry}
              onEdit={(quizId) => setInfoQuizId(quizId)}
              onMutated={handleMutated}
            />
            <QuizPagination
              page={page}
              totalItems={filtered.length}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
            />
          </div>
          <QuizLeaderboard items={leaderboard} />
        </section>
      </div>

      <QuizInfoModal
        quizId={infoQuizId}
        onClose={() => setInfoQuizId(null)}
        onMutated={handleMutated}
        onContinue={(quizId) => {
          setInfoQuizId(null);
          setBuilderQuizId(quizId);
        }}
      />

      <QuizBuilderModal
        quizId={builderQuizId}
        refreshKey={builderRefreshKey}
        subjects={subjects}
        onClose={() => {
          setQuestionTarget(null);
          setBuilderQuizId(null);
        }}
        onEditQuestion={(questionId, position) => {
          if (!builderQuizId) return;
          setQuestionTarget({ quizId: builderQuizId, questionId, position });
        }}
        onMutated={handleMutated}
      />

      <QuestionEditModal
        target={questionTarget}
        onClose={() => setQuestionTarget(null)}
        onSaved={() => setBuilderRefreshKey((prev) => prev + 1)}
      />

      <CreateQuizModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(quizId) => {
          setRefreshKey((prev) => prev + 1);
          setInfoQuizId(quizId);
        }}
      />
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
