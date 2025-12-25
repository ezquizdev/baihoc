"use client";

import { FunnelSimple } from "phosphor-react";
import { useEffect, useState } from "react";
import type { DifficultyLevel } from "@/application/models/enums";
import type { Subject } from "@/application/models/subject";
import { getSubjectTone } from "@/components/quiz-catalog/subject-tone";
import styles from "./manage-quiz-filters.module.css";

type SortOrder = "newest" | "oldest";
type StatusFilter = "active" | "draft" | "published" | "all";

type ManageQuizFiltersProps = {
  statusFilter: StatusFilter;
  onStatusFilterChange: (status: StatusFilter) => void;
  sort: SortOrder;
  onSortChange: (sort: SortOrder) => void;
  subjects: Subject[];
  selectedSubjectIds: string[];
  onSubjectToggle: (subjectId: string) => void;
  selectedDifficulties: DifficultyLevel[];
  onDifficultyToggle: (difficulty: DifficultyLevel) => void;
  minQuestions: number;
  maxQuestions: number;
  questionMaxLimit: number;
  onQuestionRangeChange: (min: number, max: number) => void;
  minDuration: number;
  maxDuration: number;
  durationMaxLimit: number;
  onDurationRangeChange: (min: number, max: number) => void;
};

const difficultyLevels: DifficultyLevel[] = [5, 4, 3, 2, 1];

export function ManageQuizFilters({
  statusFilter,
  onStatusFilterChange,
  sort,
  onSortChange,
  subjects,
  selectedSubjectIds,
  onSubjectToggle,
  selectedDifficulties,
  onDifficultyToggle,
  minQuestions,
  maxQuestions,
  questionMaxLimit,
  onQuestionRangeChange,
  minDuration,
  maxDuration,
  durationMaxLimit,
  onDurationRangeChange,
}: ManageQuizFiltersProps) {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const isStatusActive = statusFilter !== "active";
  const isSubjectActive = selectedSubjectIds.length > 0;
  const isDifficultyActive = selectedDifficulties.length > 0;
  const isRangeActive =
    minQuestions !== 0 ||
    maxQuestions !== questionMaxLimit ||
    minDuration !== 0 ||
    maxDuration !== durationMaxLimit;

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
        <div
          className={`${styles.dd} ${styles.ddWide} ${
            isStatusActive ? styles.ddActive : ""
          } ${openDropdown === "status" ? styles.ddOpen : ""}`}
          data-dropdown-root
        >
          <button
            type="button"
            className={`${styles.ddButton} ${
              isStatusActive ? styles.ddButtonActive : ""
            }`}
            aria-expanded={openDropdown === "status"}
            onClick={() => toggleDropdown("status")}
          >
            <span className={styles.ddLabel}>Trạng thái</span>
            {isStatusActive ? (
              <FunnelSimple
                size={16}
                weight="bold"
                className={styles.filterIcon}
              />
            ) : (
              <span className={styles.ddChevron} aria-hidden="true" />
            )}
          </button>
          {openDropdown === "status" ? (
            <div className={styles.ddPanel}>
              <fieldset className={styles.ddList} aria-label="Trạng thái quiz">
                <label className={styles.ck}>
                  <input
                    type="radio"
                    name="quizStatus"
                    checked={statusFilter === "active"}
                    onChange={() => onStatusFilterChange("active")}
                  />
                  Đang hoạt động
                </label>
                <label className={styles.ck}>
                  <input
                    type="radio"
                    name="quizStatus"
                    checked={statusFilter === "draft"}
                    onChange={() => onStatusFilterChange("draft")}
                  />
                  Bản nháp
                </label>
                <label className={styles.ck}>
                  <input
                    type="radio"
                    name="quizStatus"
                    checked={statusFilter === "published"}
                    onChange={() => onStatusFilterChange("published")}
                  />
                  Đã xuất bản
                </label>
                <label className={styles.ck}>
                  <input
                    type="radio"
                    name="quizStatus"
                    checked={statusFilter === "all"}
                    onChange={() => onStatusFilterChange("all")}
                  />
                  Tất cả
                </label>
              </fieldset>
            </div>
          ) : null}
        </div>

        <div
          className={`${styles.dd} ${styles.ddWide} ${
            openDropdown === "sort" ? styles.ddOpen : ""
          }`}
          data-dropdown-root
        >
          <button
            type="button"
            className={styles.ddButton}
            aria-expanded={openDropdown === "sort"}
            onClick={() => toggleDropdown("sort")}
          >
            <span className={styles.ddLabel}>Ngày cập nhật</span>
            <span className={styles.ddChevron} aria-hidden="true" />
          </button>
          {openDropdown === "sort" ? (
            <div className={styles.ddPanel}>
              <fieldset className={styles.ddList} aria-label="Ngày cập nhật">
                <label className={styles.ck}>
                  <input
                    type="radio"
                    name="sort"
                    checked={sort === "newest"}
                    onChange={() => onSortChange("newest")}
                  />
                  Mới nhất
                </label>
                <label className={styles.ck}>
                  <input
                    type="radio"
                    name="sort"
                    checked={sort === "oldest"}
                    onChange={() => onSortChange("oldest")}
                  />
                  Cũ nhất
                </label>
              </fieldset>
            </div>
          ) : null}
        </div>

        <div
          className={`${styles.dd} ${styles.ddWide} ${
            isSubjectActive ? styles.ddActive : ""
          } ${openDropdown === "subject" ? styles.ddOpen : ""}`}
          data-dropdown-root
        >
          <button
            type="button"
            className={`${styles.ddButton} ${
              isSubjectActive ? styles.ddButtonActive : ""
            }`}
            aria-expanded={openDropdown === "subject"}
            onClick={() => toggleDropdown("subject")}
          >
            <span className={styles.ddLabel}>Môn học</span>
            {isSubjectActive ? (
              <FunnelSimple
                size={16}
                weight="bold"
                className={styles.filterIcon}
              />
            ) : (
              <span className={styles.ddChevron} aria-hidden="true" />
            )}
          </button>
          {openDropdown === "subject" ? (
            <div className={styles.ddPanel}>
              <fieldset className={styles.ddList} aria-label="Chọn môn học">
                {subjects.map((subject) => {
                  const selected = selectedSubjectIds.includes(subject.id);
                  return (
                    <label key={subject.id} className={styles.ck}>
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => onSubjectToggle(subject.id)}
                      />
                      <span
                        className={`${styles.subjectOption} ${subjectUnderlineClass(
                          subject.slug,
                          styles,
                        )}`}
                      >
                        {subject.name}
                      </span>
                    </label>
                  );
                })}
              </fieldset>
            </div>
          ) : null}
        </div>

        <div
          className={`${styles.dd} ${
            isDifficultyActive ? styles.ddActive : ""
          } ${openDropdown === "difficulty" ? styles.ddOpen : ""}`}
          data-dropdown-root
        >
          <button
            type="button"
            className={`${styles.ddButton} ${
              isDifficultyActive ? styles.ddButtonActive : ""
            }`}
            aria-expanded={openDropdown === "difficulty"}
            onClick={() => toggleDropdown("difficulty")}
          >
            <span className={styles.ddLabel}>Độ khó</span>
            {isDifficultyActive ? (
              <FunnelSimple
                size={16}
                weight="bold"
                className={styles.filterIcon}
              />
            ) : (
              <span className={styles.ddChevron} aria-hidden="true" />
            )}
          </button>
          {openDropdown === "difficulty" ? (
            <div className={styles.ddPanel}>
              <fieldset className={styles.ddList} aria-label="Chọn độ khó">
                {difficultyLevels.map((level) => {
                  const selected = selectedDifficulties.includes(level);
                  return (
                    <div key={level} className={styles.ddItem}>
                      <label className={styles.ck}>
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => onDifficultyToggle(level)}
                        />
                      </label>
                      <span
                        className={`${styles.rateChip} ${difficultyRateClass(
                          level,
                          styles,
                        )}`}
                      >
                        {level}
                        <span className={styles.rateStar} aria-hidden="true" />
                      </span>
                    </div>
                  );
                })}
              </fieldset>
            </div>
          ) : null}
        </div>

        <div
          className={`${styles.dd} ${styles.ddSlider} ${
            isRangeActive ? styles.ddActive : ""
          } ${openDropdown === "range" ? styles.ddOpen : ""}`}
          data-dropdown-root
        >
          <button
            type="button"
            className={`${styles.ddButton} ${
              isRangeActive ? styles.ddButtonActive : ""
            }`}
            aria-expanded={openDropdown === "range"}
            onClick={() => toggleDropdown("range")}
          >
            <span className={styles.ddLabel}>
              <span>Thời gian</span>
              <span>Số câu</span>
            </span>
            {isRangeActive ? (
              <FunnelSimple
                size={16}
                weight="bold"
                className={styles.filterIcon}
              />
            ) : (
              <span className={styles.ddChevron} aria-hidden="true" />
            )}
          </button>
          {openDropdown === "range" ? (
            <div className={styles.ddPanel}>
              <div className={styles.sliderBlock}>
                <div className={styles.sliderRow}>
                  <span>Số câu</span>
                  <span>
                    {minQuestions}-{maxQuestions}
                  </span>
                </div>
                <DoubleRange
                  min={0}
                  max={Math.max(1, questionMaxLimit)}
                  valueMin={minQuestions}
                  valueMax={maxQuestions}
                  onChange={onQuestionRangeChange}
                />
                <div className={styles.sliderRow}>
                  <span>Thời gian (phút)</span>
                  <span>
                    {minDuration}-{maxDuration}
                  </span>
                </div>
                <DoubleRange
                  min={0}
                  max={Math.max(1, durationMaxLimit)}
                  valueMin={minDuration}
                  valueMax={maxDuration}
                  onChange={onDurationRangeChange}
                />
              </div>
            </div>
          ) : null}
        </div>
      </fieldset>
    </section>
  );
}

function DoubleRange({
  min,
  max,
  valueMin,
  valueMax,
  onChange,
}: {
  min: number;
  max: number;
  valueMin: number;
  valueMax: number;
  onChange: (min: number, max: number) => void;
}) {
  const safeMin = Math.min(valueMin, valueMax);
  const safeMax = Math.max(valueMin, valueMax);
  const percentMin = ((safeMin - min) / (max - min)) * 100;
  const percentMax = ((safeMax - min) / (max - min)) * 100;

  return (
    <div className={styles.rangeWrap}>
      <span
        className={styles.rangeTrack}
        style={{ left: `${percentMin}%`, right: `${100 - percentMax}%` }}
      />
      <input
        className={styles.rangeInput}
        type="range"
        min={min}
        max={max}
        step={1}
        value={safeMin}
        onChange={(event) => {
          const nextMin = Math.min(Number(event.target.value), safeMax);
          onChange(nextMin, safeMax);
        }}
        aria-label="Giá trị tối thiểu"
      />
      <input
        className={styles.rangeInput}
        type="range"
        min={min}
        max={max}
        step={1}
        value={safeMax}
        onChange={(event) => {
          const nextMax = Math.max(Number(event.target.value), safeMin);
          onChange(safeMin, nextMax);
        }}
        aria-label="Giá trị tối đa"
      />
    </div>
  );
}

function subjectUnderlineClass(slug: string, moduleStyles: typeof styles) {
  const tone = getSubjectTone(slug);
  switch (tone) {
    case "math":
      return moduleStyles.subjectUnderlineSky;
    case "sci":
      return moduleStyles.subjectUnderlineBlue;
    case "vi":
      return moduleStyles.subjectUnderlineRed;
    case "en":
      return moduleStyles.subjectUnderlineYellow;
    default:
      return "";
  }
}

function difficultyRateClass(
  level: DifficultyLevel,
  moduleStyles: typeof styles,
) {
  if (level >= 5) return moduleStyles.rateRed;
  if (level >= 3) return moduleStyles.rateYellow;
  return moduleStyles.rateBlue;
}
