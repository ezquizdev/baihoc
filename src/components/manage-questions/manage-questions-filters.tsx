"use client";

import { FunnelSimple } from "phosphor-react";
import { useEffect, useState } from "react";
import type { DifficultyLevel } from "@/application/models/enums";
import type { Subject } from "@/application/models/subject";
import styles from "./manage-questions-filters.module.css";

export type QuestionStatusFilter = "active" | "archived" | "all";

type ManageQuestionsFiltersProps = {
  subjects: Subject[];
  subjectId: string | null;
  onSubjectChange: (subjectId: string | null) => void;
  difficulty: DifficultyLevel | null;
  onDifficultyChange: (difficulty: DifficultyLevel | null) => void;
  status: QuestionStatusFilter;
  onStatusChange: (status: QuestionStatusFilter) => void;
};

const difficultyLevels: DifficultyLevel[] = [5, 4, 3, 2, 1];

export function ManageQuestionsFilters({
  subjects,
  subjectId,
  onSubjectChange,
  difficulty,
  onDifficultyChange,
  status,
  onStatusChange,
}: ManageQuestionsFiltersProps) {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const isSubjectActive = Boolean(subjectId);
  const isDifficultyActive = difficulty !== null;
  const isStatusActive = status !== "active";

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      const root = event.target.closest("[data-dropdown-root]");
      if (!root) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const toggleDropdown = (key: string) => {
    setOpenDropdown((prev) => (prev === key ? null : key));
  };

  return (
    <section className={`cardBase ${styles.filters}`} aria-label="Filters">
      <fieldset className={styles.filterRow} aria-label="Bộ lọc">
        <div className={styles.dd} data-dropdown-root>
          <button
            type="button"
            className={`${styles.ddButton} ${
              isSubjectActive ? styles.ddButtonActive : ""
            }`}
            aria-expanded={openDropdown === "subject"}
            onClick={() => toggleDropdown("subject")}
          >
            <span>Môn học</span>
            {isSubjectActive ? (
              <FunnelSimple size={16} weight="bold" />
            ) : (
              <span className={styles.ddChevron} aria-hidden="true" />
            )}
          </button>
          {openDropdown === "subject" ? (
            <div className={styles.ddPanel}>
              <fieldset className={styles.ddList} aria-label="Chọn môn học">
                <label className={styles.ck}>
                  <input
                    type="radio"
                    name="subjectId"
                    checked={!subjectId}
                    onChange={() => onSubjectChange(null)}
                  />
                  Tất cả
                </label>
                {subjects.map((subject) => (
                  <label key={subject.id} className={styles.ck}>
                    <input
                      type="radio"
                      name="subjectId"
                      checked={subjectId === subject.id}
                      onChange={() => onSubjectChange(subject.id)}
                    />
                    {subject.name}
                  </label>
                ))}
              </fieldset>
            </div>
          ) : null}
        </div>

        <div className={styles.dd} data-dropdown-root>
          <button
            type="button"
            className={`${styles.ddButton} ${
              isDifficultyActive ? styles.ddButtonActive : ""
            }`}
            aria-expanded={openDropdown === "difficulty"}
            onClick={() => toggleDropdown("difficulty")}
          >
            <span>Độ khó</span>
            {isDifficultyActive ? (
              <FunnelSimple size={16} weight="bold" />
            ) : (
              <span className={styles.ddChevron} aria-hidden="true" />
            )}
          </button>
          {openDropdown === "difficulty" ? (
            <div className={styles.ddPanel}>
              <fieldset className={styles.ddList} aria-label="Chọn độ khó">
                <label className={styles.ck}>
                  <input
                    type="radio"
                    name="difficulty"
                    checked={difficulty === null}
                    onChange={() => onDifficultyChange(null)}
                  />
                  Tất cả
                </label>
                {difficultyLevels.map((level) => (
                  <label key={level} className={styles.ck}>
                    <input
                      type="radio"
                      name="difficulty"
                      checked={difficulty === level}
                      onChange={() => onDifficultyChange(level)}
                    />
                    {level} ★
                  </label>
                ))}
              </fieldset>
            </div>
          ) : null}
        </div>

        <div className={styles.dd} data-dropdown-root>
          <button
            type="button"
            className={`${styles.ddButton} ${
              isStatusActive ? styles.ddButtonActive : ""
            }`}
            aria-expanded={openDropdown === "status"}
            onClick={() => toggleDropdown("status")}
          >
            <span>Trạng thái</span>
            {isStatusActive ? (
              <FunnelSimple size={16} weight="bold" />
            ) : (
              <span className={styles.ddChevron} aria-hidden="true" />
            )}
          </button>
          {openDropdown === "status" ? (
            <div className={styles.ddPanel}>
              <fieldset className={styles.ddList} aria-label="Trạng thái">
                <label className={styles.ck}>
                  <input
                    type="radio"
                    name="status"
                    checked={status === "active"}
                    onChange={() => onStatusChange("active")}
                  />
                  Đang hoạt động
                </label>
                <label className={styles.ck}>
                  <input
                    type="radio"
                    name="status"
                    checked={status === "archived"}
                    onChange={() => onStatusChange("archived")}
                  />
                  Đã lưu trữ
                </label>
                <label className={styles.ck}>
                  <input
                    type="radio"
                    name="status"
                    checked={status === "all"}
                    onChange={() => onStatusChange("all")}
                  />
                  Tất cả
                </label>
              </fieldset>
            </div>
          ) : null}
        </div>
      </fieldset>
    </section>
  );
}
