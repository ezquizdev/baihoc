"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { SessionPayload } from "@/application/infra/auth/session";
import type { DifficultyLevel } from "@/application/models/enums";
import type { Question } from "@/application/models/question";
import type { Subject } from "@/application/models/subject";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { QuizPagination } from "@/components/quiz-catalog/quiz-pagination";
import {
  ManageQuestionsFilters,
  type QuestionStatusFilter,
} from "./manage-questions-filters";
import styles from "./manage-questions-screen.module.css";
import { QuestionTable } from "./question-table";

type ManageQuestionsScreenProps = {
  session: SessionPayload;
  subjects: Subject[];
  initialItems: Question[];
  initialTotal: number;
  initialLimit: number;
};

const staffNavItems = [
  { key: "overview", label: "Tổng quan" },
  { key: "quizzes", label: "Tất cả quiz", href: "/staff/quizzes" },
  { key: "question-bank", label: "Kho câu hỏi", href: "/staff/questions" },
  { key: "students", label: "Quản lý học sinh" },
  { key: "leaderboard", label: "Bảng xếp hạng" },
  { key: "analytics", label: "Phân tích thống kê" },
  { key: "settings", label: "Cài đặt" },
];

export function ManageQuestionsScreen({
  session,
  subjects,
  initialItems,
  initialTotal,
  initialLimit,
}: ManageQuestionsScreenProps) {
  const displayName = session.fullName ?? session.email.split("@")[0];
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<DifficultyLevel | null>(null);
  const [status, setStatus] = useState<QuestionStatusFilter>("active");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<Question[]>(initialItems);
  const [total, setTotal] = useState<number>(initialTotal);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const pageSize = initialLimit;

  useEffect(() => {
    const controller = new AbortController();
    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        const params = new URLSearchParams();
        params.set("limit", String(pageSize));
        params.set("offset", String((page - 1) * pageSize));
        if (subjectId) params.set("subjectId", subjectId);
        if (difficulty !== null) params.set("difficulty", String(difficulty));
        if (status !== "all") params.set("status", status);
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
    difficulty,
    page,
    pageSize,
    refreshKey,
    status,
    subjectId,
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
    <DashboardShell
      activeNav="question-bank"
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

        <ManageQuestionsFilters
          subjects={subjects}
          subjectId={subjectId}
          onSubjectChange={(next) => {
            setSubjectId(next);
            setPage(1);
          }}
          difficulty={difficulty}
          onDifficultyChange={(next) => {
            setDifficulty(next);
            setPage(1);
          }}
          status={status}
          onStatusChange={(next) => {
            setStatus(next);
            setPage(1);
          }}
        />

        <section className={`cardBase ${styles.listCard}`} aria-label="List">
          <div className={styles.listHead}>
            <h2 className={styles.listTitle}>Danh sách câu hỏi</h2>
            <span className={styles.subtle}>{caption}</span>
          </div>

          <QuestionTable
            items={items}
            subjects={subjects}
            isLoading={loading}
            error={error}
            onRetry={handleRetry}
            onMutated={handleMutated}
          />

          <QuizPagination
            page={page}
            totalItems={total}
            pageSize={pageSize}
            onPageChange={setPage}
          />
        </section>
      </div>
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
