"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Topic } from "@/application/models/topic";
import styles from "./topic-picker.module.css";

type TopicPickerProps = {
  subjectId: string;
  subjectName?: string;
  selectedIds: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
};

export function TopicPicker({
  subjectId,
  subjectName,
  selectedIds,
  onChange,
  disabled = false,
}: TopicPickerProps) {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const prevSubjectId = useRef<string | null>(null);

  useEffect(() => {
    if (!subjectId) {
      setTopics([]);
      setError(null);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        const params = new URLSearchParams();
        params.set("subjectIds", subjectId);
        const response = await fetch(
          `/api/catalog/topics?${params.toString()}`,
          {
            signal: controller.signal,
          },
        );
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload?.error ?? "Không thể tải danh sách chủ đề");
        }
        const payload = (await response.json()) as { items?: Topic[] };
        setTopics(Array.isArray(payload.items) ? payload.items : []);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError(
          err instanceof Error ? err.message : "Không thể tải danh sách chủ đề",
        );
      } finally {
        setLoading(false);
      }
    };

    run();
    return () => controller.abort();
  }, [subjectId]);

  useEffect(() => {
    if (!subjectId) return;
    if (prevSubjectId.current && prevSubjectId.current !== subjectId) {
      onChange([]);
    }
    prevSubjectId.current = subjectId;
  }, [onChange, subjectId]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (event: MouseEvent) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const selectedTopics = useMemo(
    () => topics.filter((topic) => selectedIds.includes(topic.id)),
    [selectedIds, topics],
  );

  const triggerLabel = useMemo(() => {
    if (!subjectId) return "Chọn môn học trước";
    if (selectedTopics.length) {
      return selectedTopics.map((topic) => topic.name).join(", ");
    }
    if (selectedIds.length) {
      return `${selectedIds.length} chủ đề đã chọn`;
    }
    return "Chọn chủ đề...";
  }, [selectedIds.length, selectedTopics, subjectId]);

  const toggleTopic = (topicId: string) => {
    const exists = selectedIds.includes(topicId);
    if (exists) {
      onChange(selectedIds.filter((id) => id !== topicId));
    } else {
      onChange([...selectedIds, topicId]);
    }
  };

  return (
    <div className={styles.topicPicker} ref={wrapperRef}>
      <button
        type="button"
        className={styles.topicTrigger}
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="listbox"
        disabled={disabled || !subjectId}
      >
        <span className={!selectedIds.length ? styles.topicPlaceholder : ""}>
          {triggerLabel}
        </span>
      </button>

      {open ? (
        <div
          className={styles.topicDropdown}
          role="listbox"
          aria-label={`Chọn chủ đề ${subjectName ?? ""}`.trim()}
        >
          {loading ? (
            <div className={styles.topicHint}>Đang tải danh sách chủ đề...</div>
          ) : null}
          {error ? (
            <div className={styles.inlineError} role="alert">
              {error}
            </div>
          ) : null}
          {!loading && !error && topics.length === 0 ? (
            <div className={styles.topicHint}>Chưa có chủ đề cho môn này.</div>
          ) : null}
          {!loading && !error
            ? topics.map((topic) => (
                <label key={topic.id} className={styles.topicOption}>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(topic.id)}
                    onChange={() => toggleTopic(topic.id)}
                    disabled={disabled}
                  />
                  <span>{topic.name}</span>
                </label>
              ))
            : null}
        </div>
      ) : null}
    </div>
  );
}
