"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { SessionPayload } from "@/application/infra/auth/session";
import {
  type DifficultyLevel,
  DifficultyLevelValues,
  QuestionTypeValues,
} from "@/application/models/enums";
import type { Question } from "@/application/models/question";
import type {
  QuestionSortBy,
  QuestionSortDir,
} from "@/application/models/questionList";
import type { Subject } from "@/application/models/subject";
import { QuizPagination } from "@/components/quiz-catalog/quiz-pagination";
import { StaffShell } from "@/components/staff-dashboard/StaffShell";
import { NoticeModal } from "@/components/ui/notice-modal";
import styles from "./manage-questions-screen.module.css";
import { QuestionTable } from "./question-table";

type ManageQuestionsScreenProps = {
  session: SessionPayload;
  subjects: Subject[];
  initialItems: Question[];
  initialTotal: number;
  initialLimit: number;
};

export function ManageQuestionsScreen({
  session,
  subjects,
  initialItems,
  initialTotal,
  initialLimit,
}: ManageQuestionsScreenProps) {
  const displayName = session.fullName ?? session.email.split("@")[0];
  const [subjectIds, setSubjectIds] = useState<string[]>(() =>
    subjects.map((subject) => subject.id),
  );
  const [difficultyLevels, setDifficultyLevels] = useState<DifficultyLevel[]>(
    () => [...DifficultyLevelValues],
  );
  const [types, setTypes] = useState<Question["type"][]>(() => [
    ...QuestionTypeValues,
  ]);
  const [statuses, setStatuses] = useState<Question["status"][]>(["active"]);
  const [sortBy, setSortBy] = useState<QuestionSortBy>("updatedAt");
  const [sortDir, setSortDir] = useState<QuestionSortDir>("desc");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<Question[]>(initialItems);
  const [total, setTotal] = useState<number>(initialTotal);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const pageSize = initialLimit;

  useEffect(() => {
    if (!loading) {
      document.body.classList.remove("loading-open");
      return;
    }
    document.body.classList.add("loading-open");
    return () => {
      document.body.classList.remove("loading-open");
    };
  }, [loading]);

  useEffect(() => {
    const controller = new AbortController();
    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        const params = new URLSearchParams();
        params.set("limit", String(pageSize));
        params.set("offset", String((page - 1) * pageSize));
        if (subjectIds.length !== subjects.length)
          params.set("subjectIds", subjectIds.join(","));
        if (difficultyLevels.length !== DifficultyLevelValues.length)
          params.set("difficultyLevels", difficultyLevels.join(","));
        if (types.length !== QuestionTypeValues.length)
          params.set("types", types.join(","));
        if (statuses.length) params.set("statuses", statuses.join(","));
        params.set("sortBy", sortBy);
        params.set("sortDir", sortDir);
        if (debouncedSearch.trim())
          params.set("search", debouncedSearch.trim());
        params.set("_", String(refreshKey));

        const response = await fetch(`/api/staff/questions?${params}`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload?.error ?? "Không thể tải câu hỏi");
        }
        const payload = await response.json();
        setItems(
          Array.isArray(payload.items) ? (payload.items as Question[]) : [],
        );
        setTotal(Number(payload.total ?? 0));
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Không thể tải câu hỏi");
      } finally {
        setLoading(false);
      }
    };
    run();
    return () => controller.abort();
  }, [
    debouncedSearch,
    difficultyLevels,
    page,
    pageSize,
    refreshKey,
    sortBy,
    sortDir,
    statuses,
    subjectIds,
    subjects.length,
    types,
  ]);

  const caption = useMemo(() => {
    if (total <= 0) return "0 câu hỏi";
    const start = (page - 1) * pageSize + 1;
    const end = Math.min(total, page * pageSize);
    return `${start}-${end} / ${total} câu hỏi`;
  }, [page, pageSize, total]);

  const handleRetry = () => {
    setError(null);
    setRefreshKey((prev) => prev + 1);
  };

  const handleMutated = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <StaffShell
      activeNav="questions"
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
      searchPlaceholder="Tìm câu hỏi"
    >
      <div className={styles.page}>
        <section className={`cardBase ${styles.hero}`} aria-label="Hero">
          <div>
            <h1 className={styles.heroTitle}>Kho câu hỏi</h1>
            <p className={styles.heroText}>
              Tạo, chỉnh sửa, lưu trữ và chọn câu hỏi để xây dựng quiz.
            </p>
          </div>
          <div className={styles.heroActions}>
            <Link className={styles.cta} href="/staff/questions/new">
              + Tạo câu hỏi
            </Link>
          </div>
        </section>

        <section className={`cardBase ${styles.listCard}`} aria-label="List">
          <div className={styles.listHead}>
            <h2 className={styles.listTitle}>Danh sách câu hỏi</h2>
            <span className={styles.subtle}>{caption}</span>
          </div>

          <QuestionTable
            items={items}
            subjects={subjects}
            subjectIds={subjectIds}
            onSubjectIdsChange={(next) => {
              setSubjectIds(next);
              setPage(1);
            }}
            difficultyLevels={difficultyLevels}
            onDifficultyLevelsChange={(next) => {
              setDifficultyLevels(next);
              setPage(1);
            }}
            types={types}
            onTypesChange={(next) => {
              setTypes(next);
              setPage(1);
            }}
            statuses={statuses}
            onStatusesChange={(next) => {
              setStatuses(next);
              setPage(1);
            }}
            sortBy={sortBy}
            sortDir={sortDir}
            onSortChange={(nextBy, nextDir) => {
              setSortBy(nextBy);
              setSortDir(nextDir);
              setPage(1);
            }}
            isLoading={loading}
            error={error}
            onRetry={handleRetry}
            onMutated={handleMutated}
            onSuccess={(message) => setSuccessNotice(message)}
          />

          <QuizPagination
            page={page}
            totalItems={total}
            pageSize={pageSize}
            onPageChange={setPage}
          />
        </section>
      </div>

      {loading ? (
        <div className={styles.loadingOverlay} role="presentation">
          <div className={styles.loadingBackdrop} aria-hidden="true" />
          <output
            className={styles.loadingDialog}
            aria-live="polite"
            aria-label="Đang tải"
          >
            <span className={styles.loadingSpinner} aria-hidden="true" />
            <span className={styles.loadingText}>Đang tải...</span>
          </output>
        </div>
      ) : null}

      <NoticeModal
        open={successNotice !== null}
        title="Thành công"
        message={successNotice ?? ""}
        tone="success"
        closeLabel="OK"
        onClose={() => setSuccessNotice(null)}
      />
    </StaffShell>
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
