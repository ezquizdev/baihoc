"use client";

import Link from "next/link";
import { X } from "phosphor-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { DifficultyLevel } from "@/application/models/enums";
import type { Question } from "@/application/models/question";
import type { Subject } from "@/application/models/subject";
import { QuizPagination } from "@/components/quiz-catalog/quiz-pagination";
import styles from "./manage-quiz-modals.module.css";

type QuestionBankPickerModalProps = {
  open: boolean;
  subjects: Subject[];
  existingQuestionIds: string[];
  onClose: () => void;
  onAdd: (questions: Question[]) => void;
};

const PAGE_SIZE = 12;

export function QuestionBankPickerModal({
  open,
  subjects,
  existingQuestionIds,
  onClose,
  onAdd,
}: QuestionBankPickerModalProps) {
  const titleId = "question-bank-picker-title";
  const hadModalOpenClassRef = useRef(false);
  const existingSet = useMemo(
    () => new Set(existingQuestionIds),
    [existingQuestionIds],
  );
  const subjectMap = useMemo(() => {
    const map = new Map<string, Subject>();
    for (const subject of subjects) {
      map.set(subject.id, subject);
    }
    return map;
  }, [subjects]);

  const [subjectId, setSubjectId] = useState<string>("");
  const [difficulty, setDifficulty] = useState<DifficultyLevel | "">("");
  const [status, setStatus] = useState<"active" | "archived">("active");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 250);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<Question[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<string, Question>>({});

  useEffect(() => {
    if (!open) return;
    setPage(1);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    hadModalOpenClassRef.current =
      document.body.classList.contains("modal-open");
    document.body.classList.add("modal-open");
    return () => {
      if (!hadModalOpenClassRef.current) {
        document.body.classList.remove("modal-open");
      }
      hadModalOpenClassRef.current = false;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const run = async () => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        params.set("limit", String(PAGE_SIZE));
        params.set("offset", String((page - 1) * PAGE_SIZE));
        if (subjectId) params.set("subjectId", subjectId);
        if (difficulty !== "") params.set("difficulty", String(difficulty));
        if (status) params.set("status", status);
        if (debouncedSearch.trim())
          params.set("search", debouncedSearch.trim());

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
  }, [debouncedSearch, difficulty, open, page, status, subjectId]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      onClose();
    };
    document.addEventListener("keydown", handleKey, true);
    return () => document.removeEventListener("keydown", handleKey, true);
  }, [onClose, open]);

  if (!open) return null;

  const selectedCount = Object.keys(selected).length;
  const toolDisabled = loading;

  const toggle = (question: Question) => {
    if (existingSet.has(question.id)) return;
    setSelected((prev) => {
      if (prev[question.id]) {
        const next = { ...prev };
        delete next[question.id];
        return next;
      }
      return { ...prev, [question.id]: question };
    });
  };

  const clearSelected = () => setSelected({});

  return (
    <div className={styles.modal} role="presentation">
      <div className={styles.backdrop} onClick={onClose} aria-hidden="true" />
      <div
        className={`${styles.dialog} ${styles.dialogLarge}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className={styles.dialogHead}>
          <button
            className={styles.xbtn}
            type="button"
            onClick={onClose}
            aria-label="Close"
            disabled={toolDisabled}
          >
            <X size={16} weight="bold" />
          </button>
          <div className={styles.pickerHeadMeta}>
            <div id={titleId} className={styles.pickerTitle}>
              Chọn câu hỏi từ kho
            </div>
            <div className={styles.pickerSub}>
              {selectedCount
                ? `Đã chọn ${selectedCount}`
                : "Chọn nhiều câu hỏi"}
            </div>
          </div>
          <div className={styles.pickerHeadActions}>
            <Link
              className={styles.pickerLink}
              href="/staff/questions/new"
              target="_blank"
              rel="noopener noreferrer"
            >
              + Tạo câu hỏi
            </Link>
            {selectedCount ? (
              <button
                type="button"
                className={styles.pickerLink}
                onClick={clearSelected}
                disabled={toolDisabled}
              >
                Bỏ chọn
              </button>
            ) : null}
          </div>
        </div>

        <div className={styles.pickerFilters}>
          <input
            className={styles.pickerInput}
            placeholder="Tìm câu hỏi..."
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            disabled={toolDisabled}
          />
          <select
            className={styles.pickerSelect}
            value={subjectId}
            onChange={(event) => {
              setSubjectId(event.target.value);
              setPage(1);
            }}
            disabled={toolDisabled}
          >
            <option value="">Tất cả môn</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select
            className={styles.pickerSelect}
            value={difficulty}
            onChange={(event) => {
              const value = event.target.value;
              setDifficulty(value ? (Number(value) as DifficultyLevel) : "");
              setPage(1);
            }}
            disabled={toolDisabled}
          >
            <option value="">Tất cả độ khó</option>
            {[5, 4, 3, 2, 1].map((lvl) => (
              <option key={lvl} value={lvl}>
                {lvl} ★
              </option>
            ))}
          </select>
          <select
            className={styles.pickerSelect}
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as "active" | "archived");
              setPage(1);
            }}
            disabled={toolDisabled}
          >
            <option value="active">Hoạt động</option>
            <option value="archived">Lưu trữ</option>
          </select>
        </div>

        <div className={styles.dialogBody}>
          {loading ? (
            <output aria-live="polite">Đang tải câu hỏi...</output>
          ) : null}

          {!loading && error ? (
            <div className={styles.inlineError} role="alert">
              {error}
            </div>
          ) : null}

          {!loading && !error ? (
            <div className={styles.pickerTableWrap}>
              <table className={styles.pickerTable} aria-label="Question bank">
                <thead>
                  <tr>
                    <th scope="col" />
                    <th scope="col">Câu hỏi</th>
                    <th scope="col">Môn</th>
                    <th scope="col">Loại</th>
                    <th scope="col">Độ khó</th>
                    <th scope="col" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((q) => {
                    const alreadyInQuiz = existingSet.has(q.id);
                    const checked = Boolean(selected[q.id]);
                    const subject = subjectMap.get(q.subjectId);
                    return (
                      <tr
                        key={q.id}
                        className={`${styles.pickerRow} ${
                          alreadyInQuiz ? styles.pickerRowDisabled : ""
                        }`}
                      >
                        <td>
                          <input
                            type="checkbox"
                            checked={alreadyInQuiz ? true : checked}
                            disabled={alreadyInQuiz}
                            onChange={() => toggle(q)}
                          />
                        </td>
                        <td>
                          <div className={styles.pickerStem}>{q.stem}</div>
                          {alreadyInQuiz ? (
                            <div className={styles.pickerHint}>
                              Đã có trong quiz
                            </div>
                          ) : null}
                        </td>
                        <td>{subject?.name ?? "—"}</td>
                        <td>{typeLabel(q.type)}</td>
                        <td>{q.defaultDifficulty} ★</td>
                        <td>
                          <Link
                            className={styles.pickerLink}
                            href={`/staff/questions/${q.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Mở
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}

          <QuizPagination
            page={page}
            totalItems={total}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
          />
        </div>

        <div className={styles.pickerFooter}>
          <button
            className={`${styles.pillBtn} ${styles.pillDanger} ${
              toolDisabled ? styles.pillDisabled : ""
            }`}
            type="button"
            onClick={onClose}
            disabled={toolDisabled}
          >
            Hủy
          </button>
          <button
            className={`${styles.pillBtn} ${styles.pillAccent} ${
              toolDisabled || selectedCount === 0 ? styles.pillDisabled : ""
            }`}
            type="button"
            disabled={toolDisabled || selectedCount === 0}
            onClick={() => onAdd(Object.values(selected))}
          >
            {selectedCount ? `Thêm ${selectedCount} câu` : "Thêm"}
          </button>
        </div>
      </div>
    </div>
  );
}

function typeLabel(type: Question["type"]) {
  switch (type) {
    case "mcq_single":
      return "MCQ 1";
    case "mcq_multi":
      return "MCQ N";
    case "short_answer":
      return "Tự luận";
    default:
      return type;
  }
}

function useDebouncedValue<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}
