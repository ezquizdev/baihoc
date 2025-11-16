"use client";

import { FunnelSimple } from "phosphor-react";
import { useEffect, useState } from "react";
import type { DifficultyLabel } from "@/application/models/enums";
import type { Subject } from "@/application/models/subject";
import styles from "./quiz-catalog.module.css";

type StatusFilter = "todo" | "done" | "all";
type SortOrder = "newest" | "oldest";

type QuizFiltersProps = {
  status: StatusFilter;
  onStatusChange: (status: StatusFilter) => void;
  sort: SortOrder;
  onSortChange: (sort: SortOrder) => void;
  subjects: Subject[];
  selectedSubjectIds: string[];
  onSubjectToggle: (subjectId: string) => void;
  selectedDifficulties: DifficultyLabel[];
  onDifficultyToggle: (difficulty: DifficultyLabel) => void;
  minQuestions: number;
  maxQuestions: number;
  onQuestionRangeChange: (min: number, max: number) => void;
  minDuration: number;
  maxDuration: number;
  onDurationRangeChange: (min: number, max: number) => void;
};

const difficultyLabels: Record<DifficultyLabel, string> = {
  easy: "Dễ",
  medium: "Trung bình",
  hard: "Khó",
};

export function QuizFilters({
  status,
  onStatusChange,
  sort,
  onSortChange,
  subjects,
  selectedSubjectIds,
  onSubjectToggle,
  selectedDifficulties,
  onDifficultyToggle,
  minQuestions,
  maxQuestions,
  onQuestionRangeChange,
  minDuration,
  maxDuration,
  onDurationRangeChange,
}: QuizFiltersProps) {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const isSubjectActive = selectedSubjectIds.length > 0;
  const isDifficultyActive = selectedDifficulties.length > 0;
  const isRangeActive =
    minQuestions !== 0 ||
    maxQuestions !== 50 ||
    minDuration !== 0 ||
    maxDuration !== 50;

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!(event.target instanceof Node)) return;
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
    <section className={`${styles.card} ${styles.filters}`} aria-label="Filters">
      <div className={styles.tabs} role="tablist" aria-label="Trạng thái quiz">
        <button
          type="button"
          role="tab"
          className={`${styles.tab} ${
            status === "todo" ? styles.tabActive : ""
          }`}
          aria-selected={status === "todo"}
          onClick={() => onStatusChange("todo")}
        >
          Chưa làm
        </button>
        <button
          type="button"
          role="tab"
          className={`${styles.tab} ${
            status === "done" ? styles.tabActive : ""
          }`}
          aria-selected={status === "done"}
          onClick={() => onStatusChange("done")}
        >
          Đã làm
        </button>
        <button
          type="button"
          role="tab"
          className={`${styles.tab} ${
            status === "all" ? styles.tabActive : ""
          }`}
          aria-selected={status === "all"}
          onClick={() => onStatusChange("all")}
        >
          Tất cả
        </button>
      </div>

      <div className={styles.filterRow} aria-label="Bộ lọc">
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
              <div className={styles.ddList} aria-label="Ngày cập nhật">
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
              </div>
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
              <FunnelSimple size={16} weight="bold" className={styles.filterIcon} />
            ) : (
              <span className={styles.ddChevron} aria-hidden="true" />
            )}
          </button>
          {openDropdown === "subject" ? (
            <div className={styles.ddPanel}>
              <div className={styles.ddList} aria-label="Chọn môn học">
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
              </div>
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
              <FunnelSimple size={16} weight="bold" className={styles.filterIcon} />
            ) : (
              <span className={styles.ddChevron} aria-hidden="true" />
            )}
          </button>
          {openDropdown === "difficulty" ? (
            <div className={styles.ddPanel}>
              <div className={styles.ddList} aria-label="Chọn độ khó">
                {Object.entries(difficultyLabels).map(([value, label]) => {
                  const level = value as DifficultyLabel;
                  const selected = selectedDifficulties.includes(level);
                  return (
                    <div key={value} className={styles.ddItem}>
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
                        {label}
                        <span className={styles.rateStar} aria-hidden="true" />
                      </span>
                    </div>
                  );
                })}
              </div>
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
              <FunnelSimple size={16} weight="bold" className={styles.filterIcon} />
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
                  max={50}
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
                  max={50}
                  valueMin={minDuration}
                  valueMax={maxDuration}
                  onChange={onDurationRangeChange}
                />
              </div>
            </div>
          ) : null}
        </div>
      </div>
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
  const normalized = slug.toLowerCase();
  if (normalized.includes("math")) return moduleStyles.subjectUnderlineSky;
  if (normalized.includes("sci")) return moduleStyles.subjectUnderlineBlue;
  if (normalized.includes("vi")) return moduleStyles.subjectUnderlineRed;
  if (normalized.includes("en")) return moduleStyles.subjectUnderlineYellow;
  return "";
}

function difficultyRateClass(
  difficulty: DifficultyLabel,
  moduleStyles: typeof styles,
) {
  switch (difficulty) {
    case "easy":
      return moduleStyles.rateEasy;
    case "medium":
      return moduleStyles.rateMedium;
    case "hard":
    default:
      return moduleStyles.rateHard;
  }
}
