"use client";

import Link from "next/link";
import {
  CaretDown,
  CaretUp,
  DotsThreeVertical,
  FunnelSimple,
} from "phosphor-react";
import type { CSSProperties } from "react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import type {
  DifficultyLevel,
  QuestionStatus,
} from "@/application/models/enums";
import {
  DifficultyLevelValues,
  QuestionStatusValues,
  QuestionTypeValues,
} from "@/application/models/enums";
import type { Question, QuestionType } from "@/application/models/question";
import type {
  QuestionSortBy,
  QuestionSortDir,
} from "@/application/models/questionList";
import type { Subject } from "@/application/models/subject";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { NoticeModal } from "@/components/ui/notice-modal";
import { formatDateVi } from "@/lib/formatters";
import styles from "./question-table.module.css";

type QuestionTableProps = {
  items: Question[];
  subjects: Subject[];
  subjectIds: string[];
  onSubjectIdsChange: (subjectIds: string[]) => void;
  difficultyLevels: DifficultyLevel[];
  onDifficultyLevelsChange: (difficultyLevels: DifficultyLevel[]) => void;
  types: QuestionType[];
  onTypesChange: (types: QuestionType[]) => void;
  passageFilter: "all" | "with" | "without";
  onPassageFilterChange: (value: "all" | "with" | "without") => void;
  statuses: QuestionStatus[];
  onStatusesChange: (statuses: QuestionStatus[]) => void;
  sortBy: QuestionSortBy;
  sortDir: QuestionSortDir;
  onSortChange: (sortBy: QuestionSortBy, sortDir: QuestionSortDir) => void;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onMutated: () => void;
  onSuccess: (message: string) => void;
};

type RowError = { questionId: string; message: string } | null;

export function QuestionTable({
  items,
  subjects,
  subjectIds,
  onSubjectIdsChange,
  difficultyLevels,
  onDifficultyLevelsChange,
  types,
  onTypesChange,
  passageFilter,
  onPassageFilterChange,
  statuses,
  onStatusesChange,
  sortBy,
  sortDir,
  onSortChange,
  isLoading,
  error,
  onRetry,
  onMutated,
  onSuccess,
}: QuestionTableProps) {
  const subjectMap = useMemo(() => {
    const map = new Map<string, Subject>();
    for (const subject of subjects) {
      map.set(subject.id, subject);
    }
    return map;
  }, [subjects]);

  const [mutating, setMutating] = useState<{
    questionId: string;
    action: "archive" | "restore" | "delete";
  } | null>(null);
  const [rowError, setRowError] = useState<RowError>(null);
  const [deleteCandidateId, setDeleteCandidateId] = useState<string | null>(
    null,
  );
  const [openDropdown, setOpenDropdown] = useState<
    "subject" | "type" | "difficulty" | "status" | "passage" | null
  >(null);
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [filterMenuStyle, setFilterMenuStyle] = useState<CSSProperties | null>(
    null,
  );
  const [actionMenuStyle, setActionMenuStyle] = useState<CSSProperties | null>(
    null,
  );
  const subjectFilterRef = useRef<HTMLButtonElement | null>(null);
  const typeFilterRef = useRef<HTMLButtonElement | null>(null);
  const passageFilterRef = useRef<HTMLButtonElement | null>(null);
  const difficultyFilterRef = useRef<HTMLButtonElement | null>(null);
  const statusFilterRef = useRef<HTMLButtonElement | null>(null);
  const actionMenuRefs = useRef(new Map<string, HTMLButtonElement | null>());

  const setActionMenuRef = useCallback(
    (questionId: string) => (node: HTMLButtonElement | null) => {
      if (node) {
        actionMenuRefs.current.set(questionId, node);
      } else {
        actionMenuRefs.current.delete(questionId);
      }
    },
    [],
  );

  const getDropdownAnchor = useCallback((key: typeof openDropdown) => {
    switch (key) {
      case "subject":
        return subjectFilterRef.current;
      case "type":
        return typeFilterRef.current;
      case "passage":
        return passageFilterRef.current;
      case "difficulty":
        return difficultyFilterRef.current;
      case "status":
        return statusFilterRef.current;
      default:
        return null;
    }
  }, []);

  const totalSubjects = subjects.length;
  const totalTypes = QuestionTypeValues.length;
  const totalDifficulties = DifficultyLevelValues.length;

  const hasSubjectFilter = subjectIds.length !== totalSubjects;
  const hasTypeFilter = types.length !== totalTypes;
  const hasDifficultyFilter = difficultyLevels.length !== totalDifficulties;
  const hasStatusFilter = !setsEqual(statuses, [
    "active",
  ] satisfies QuestionStatus[]);
  const hasPassageFilter = passageFilter !== "all";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      const root = event.target.closest("[data-dropdown-root]");
      if (!root) {
        setOpenDropdown(null);
        setOpenActionMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    if (!openDropdown && !openActionMenuId) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenDropdown(null);
        setOpenActionMenuId(null);
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [openDropdown, openActionMenuId]);

  useLayoutEffect(() => {
    if (!openDropdown) {
      setFilterMenuStyle(null);
      return;
    }
    const updatePosition = () => {
      const anchor = getDropdownAnchor(openDropdown);
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      const panelWidth = 240;
      const padding = 12;
      const left = Math.min(
        Math.max(rect.right - panelWidth, padding),
        window.innerWidth - panelWidth - padding,
      );
      const top = rect.bottom + 10;
      setFilterMenuStyle({
        position: "fixed",
        top,
        left,
        zIndex: 9100,
      });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [getDropdownAnchor, openDropdown]);

  useLayoutEffect(() => {
    if (!openActionMenuId) {
      setActionMenuStyle(null);
      return;
    }
    const updatePosition = () => {
      const anchor = actionMenuRefs.current.get(openActionMenuId) ?? null;
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      const panelWidth = 180;
      const padding = 12;
      const left = Math.min(
        Math.max(rect.right - panelWidth, padding),
        window.innerWidth - panelWidth - padding,
      );
      const top = rect.bottom + 8;
      setActionMenuStyle({
        position: "fixed",
        top,
        left,
        zIndex: 9100,
      });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [openActionMenuId]);

  const handleSortToggle = (key: QuestionSortBy) => {
    if (sortBy === key) {
      onSortChange(key, sortDir === "asc" ? "desc" : "asc");
      return;
    }
    onSortChange(key, defaultSortDirFor(key));
  };

  const toggleDropdown = (key: typeof openDropdown) => {
    setOpenActionMenuId(null);
    setOpenDropdown((prev) => (prev === key ? null : key));
  };

  const toggleActionMenu = (questionId: string) => {
    setOpenDropdown(null);
    setOpenActionMenuId((prev) => (prev === questionId ? null : questionId));
  };

  const patchStatus = async (
    questionId: string,
    status: "active" | "archived",
  ) => {
    setRowError(null);
    setMutating({
      questionId,
      action: status === "archived" ? "archive" : "restore",
    });
    try {
      const response = await fetch(`/api/staff/questions/${questionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error ?? "Không thể cập nhật câu hỏi");
      }
      onSuccess(
        status === "archived" ? "Đã lưu trữ câu hỏi." : "Đã khôi phục câu hỏi.",
      );
      onMutated();
    } catch (err) {
      setRowError({
        questionId,
        message:
          err instanceof Error ? err.message : "Không thể cập nhật câu hỏi",
      });
    } finally {
      setMutating(null);
    }
  };

  const deleteQuestionConfirmed = async (questionId: string) => {
    setRowError(null);
    setMutating({ questionId, action: "delete" });
    try {
      const response = await fetch(`/api/staff/questions/${questionId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error ?? "Không thể xóa câu hỏi");
      }
      const payload = await response.json().catch(() => null);
      if (payload && typeof payload === "object" && "status" in payload) {
        const status = (payload as { status?: unknown }).status;
        if (status === "archived") {
          onSuccess("Câu hỏi đang được dùng trong quiz nên đã được lưu trữ.");
        } else {
          onSuccess("Đã xóa câu hỏi.");
        }
      } else {
        onSuccess("Đã xóa câu hỏi.");
      }
      onMutated();
    } catch (err) {
      setRowError({
        questionId,
        message: err instanceof Error ? err.message : "Không thể xóa câu hỏi",
      });
    } finally {
      setMutating(null);
    }
  };

  const requestDeleteQuestion = (questionId: string) => {
    setDeleteCandidateId(questionId);
  };

  const allSubjectIds = useMemo(
    () => subjects.map((subject) => subject.id),
    [subjects],
  );
  const difficultyOptions: DifficultyLevel[] = [5, 4, 3, 2, 1];

  const toggleSubject = (subjectId: string) => {
    const next = new Set(subjectIds);
    if (next.has(subjectId)) {
      next.delete(subjectId);
    } else {
      next.add(subjectId);
    }
    if (next.size === 0) return;
    onSubjectIdsChange(allSubjectIds.filter((id) => next.has(id)));
  };

  const toggleType = (type: QuestionType) => {
    const next = new Set(types);
    if (next.has(type)) {
      next.delete(type);
    } else {
      next.add(type);
    }
    if (next.size === 0) return;
    onTypesChange(
      QuestionTypeValues.filter((value) =>
        next.has(value as QuestionType),
      ) as QuestionType[],
    );
  };

  const toggleDifficulty = (level: DifficultyLevel) => {
    const next = new Set(difficultyLevels);
    if (next.has(level)) {
      next.delete(level);
    } else {
      next.add(level);
    }
    if (next.size === 0) return;
    onDifficultyLevelsChange(
      difficultyOptions.filter((value) => next.has(value)),
    );
  };

  const toggleStatus = (status: QuestionStatus) => {
    const next = new Set(statuses);
    if (next.has(status)) {
      next.delete(status);
    } else {
      next.add(status);
    }
    if (next.size === 0) return;
    onStatusesChange(
      QuestionStatusValues.filter((value) =>
        next.has(value as QuestionStatus),
      ) as QuestionStatus[],
    );
  };

  return (
    <div className={styles.tableWrap} aria-busy={isLoading}>
      <table className={styles.table} aria-label="Danh sách câu hỏi">
        <thead>
          <tr>
            <th
              scope="col"
              aria-sort={
                (sortBy === "stem"
                  ? sortDir === "asc"
                    ? "ascending"
                    : "descending"
                  : "none") as "ascending" | "descending" | "none"
              }
            >
              <button
                type="button"
                className={`${styles.sortButton} ${
                  sortBy === "stem" ? styles.sortButtonActive : ""
                }`}
                onClick={() => handleSortToggle("stem")}
                disabled={isLoading}
                title="Sắp xếp theo nội dung"
              >
                <span>Nội dung</span>
                <span className={styles.sortIcon} aria-hidden="true">
                  {sortBy === "stem" ? (
                    sortDir === "asc" ? (
                      <CaretUp weight="bold" size={16} />
                    ) : (
                      <CaretDown weight="bold" size={16} />
                    )
                  ) : (
                    <>
                      <CaretUp size={12} />
                      <CaretDown size={12} />
                    </>
                  )}
                </span>
              </button>
            </th>
            <th
              scope="col"
              aria-sort={
                (sortBy === "subject"
                  ? sortDir === "asc"
                    ? "ascending"
                    : "descending"
                  : "none") as "ascending" | "descending" | "none"
              }
            >
              <div className={styles.th} data-dropdown-root>
                <button
                  type="button"
                  className={`${styles.sortButton} ${
                    sortBy === "subject" ? styles.sortButtonActive : ""
                  }`}
                  onClick={() => handleSortToggle("subject")}
                  disabled={isLoading}
                  title="Sắp xếp theo môn"
                >
                  <span>Môn</span>
                </button>
                <button
                  type="button"
                  className={`${styles.filterButton} ${
                    hasSubjectFilter ? styles.filterButtonActive : ""
                  }`}
                  aria-label="Lọc theo môn"
                  aria-expanded={openDropdown === "subject"}
                  onClick={() => toggleDropdown("subject")}
                  disabled={isLoading}
                  ref={subjectFilterRef}
                >
                  <FunnelSimple
                    size={16}
                    weight={hasSubjectFilter ? "bold" : "regular"}
                  />
                </button>
                {mounted && openDropdown === "subject" && filterMenuStyle
                  ? createPortal(
                      <div
                        className={styles.menuPanel}
                        role="dialog"
                        aria-label="Bộ lọc môn"
                        style={filterMenuStyle}
                        data-dropdown-root
                      >
                        <div className={styles.menuSection}>
                          <div className={styles.menuTitle}>Sắp xếp</div>
                          <button
                            type="button"
                            className={styles.menuButton}
                            onClick={() => {
                              onSortChange("subject", "asc");
                              setOpenDropdown(null);
                            }}
                          >
                            A → Z
                          </button>
                          <button
                            type="button"
                            className={styles.menuButton}
                            onClick={() => {
                              onSortChange("subject", "desc");
                              setOpenDropdown(null);
                            }}
                          >
                            Z → A
                          </button>
                          <button
                            type="button"
                            className={styles.menuButton}
                            disabled={
                              sortBy === "updatedAt" && sortDir === "desc"
                            }
                            onClick={() => {
                              onSortChange("updatedAt", "desc");
                              setOpenDropdown(null);
                            }}
                          >
                            Mặc định
                          </button>
                        </div>

                        <div
                          className={styles.menuDivider}
                          role="presentation"
                        />

                        <div className={styles.menuSection}>
                          <div className={styles.menuTitle}>Lọc</div>
                          <button
                            type="button"
                            className={styles.menuButton}
                            disabled={!hasSubjectFilter}
                            onClick={() => onSubjectIdsChange(allSubjectIds)}
                          >
                            Tất cả
                          </button>
                          <fieldset
                            className={styles.menuList}
                            aria-label="Môn học"
                          >
                            {subjects.map((subject) => (
                              <label key={subject.id} className={styles.ck}>
                                <input
                                  type="checkbox"
                                  checked={subjectIds.includes(subject.id)}
                                  onChange={() => toggleSubject(subject.id)}
                                />
                                {subject.name}
                              </label>
                            ))}
                          </fieldset>
                        </div>
                      </div>,
                      document.body,
                    )
                  : null}
              </div>
            </th>
            <th
              scope="col"
              aria-sort={
                (sortBy === "type"
                  ? sortDir === "asc"
                    ? "ascending"
                    : "descending"
                  : "none") as "ascending" | "descending" | "none"
              }
            >
              <div className={styles.th} data-dropdown-root>
                <button
                  type="button"
                  className={`${styles.sortButton} ${
                    sortBy === "type" ? styles.sortButtonActive : ""
                  }`}
                  onClick={() => handleSortToggle("type")}
                  disabled={isLoading}
                  title="Sắp xếp theo loại"
                >
                  <span>Loại</span>
                </button>
                <button
                  type="button"
                  className={`${styles.filterButton} ${
                    hasTypeFilter ? styles.filterButtonActive : ""
                  }`}
                  aria-label="Lọc theo loại"
                  aria-expanded={openDropdown === "type"}
                  onClick={() => toggleDropdown("type")}
                  disabled={isLoading}
                  ref={typeFilterRef}
                >
                  <FunnelSimple
                    size={16}
                    weight={hasTypeFilter ? "bold" : "regular"}
                  />
                </button>
                {mounted && openDropdown === "type" && filterMenuStyle
                  ? createPortal(
                      <div
                        className={styles.menuPanel}
                        role="dialog"
                        aria-label="Bộ lọc loại câu hỏi"
                        style={filterMenuStyle}
                        data-dropdown-root
                      >
                        <div className={styles.menuSection}>
                          <div className={styles.menuTitle}>Sắp xếp</div>
                          <button
                            type="button"
                            className={styles.menuButton}
                            onClick={() => {
                              onSortChange("type", "asc");
                              setOpenDropdown(null);
                            }}
                          >
                            A → Z
                          </button>
                          <button
                            type="button"
                            className={styles.menuButton}
                            onClick={() => {
                              onSortChange("type", "desc");
                              setOpenDropdown(null);
                            }}
                          >
                            Z → A
                          </button>
                          <button
                            type="button"
                            className={styles.menuButton}
                            disabled={
                              sortBy === "updatedAt" && sortDir === "desc"
                            }
                            onClick={() => {
                              onSortChange("updatedAt", "desc");
                              setOpenDropdown(null);
                            }}
                          >
                            Mặc định
                          </button>
                        </div>

                        <div
                          className={styles.menuDivider}
                          role="presentation"
                        />

                        <div className={styles.menuSection}>
                          <div className={styles.menuTitle}>Lọc</div>
                          <button
                            type="button"
                            className={styles.menuButton}
                            disabled={!hasTypeFilter}
                            onClick={() =>
                              onTypesChange([...QuestionTypeValues])
                            }
                          >
                            Tất cả
                          </button>
                          <fieldset
                            className={styles.menuList}
                            aria-label="Loại"
                          >
                            {QuestionTypeValues.map((type) => (
                              <label key={type} className={styles.ck}>
                                <input
                                  type="checkbox"
                                  checked={types.includes(type as QuestionType)}
                                  onChange={() =>
                                    toggleType(type as QuestionType)
                                  }
                                />
                                {questionTypeLabel(type as QuestionType)}
                              </label>
                            ))}
                          </fieldset>
                        </div>
                      </div>,
                      document.body,
                    )
                  : null}
              </div>
            </th>
            <th scope="col">
              <div className={styles.th} data-dropdown-root>
                <span className={styles.thLabel}>Ngữ liệu</span>
                <button
                  type="button"
                  className={`${styles.filterButton} ${
                    hasPassageFilter ? styles.filterButtonActive : ""
                  }`}
                  aria-label="Lọc theo ngữ liệu"
                  aria-expanded={openDropdown === "passage"}
                  onClick={() => toggleDropdown("passage")}
                  disabled={isLoading}
                  ref={passageFilterRef}
                >
                  <FunnelSimple
                    size={16}
                    weight={hasPassageFilter ? "bold" : "regular"}
                  />
                </button>
                {mounted && openDropdown === "passage" && filterMenuStyle
                  ? createPortal(
                      <div
                        className={styles.menuPanel}
                        role="dialog"
                        aria-label="Bộ lọc ngữ liệu"
                        style={filterMenuStyle}
                        data-dropdown-root
                      >
                        <div className={styles.menuSection}>
                          <div className={styles.menuTitle}>Lọc</div>
                          <button
                            type="button"
                            className={styles.menuButton}
                            disabled={!hasPassageFilter}
                            onClick={() => {
                              onPassageFilterChange("all");
                              setOpenDropdown(null);
                            }}
                          >
                            Tất cả
                          </button>
                          <button
                            type="button"
                            className={styles.menuButton}
                            disabled={passageFilter === "with"}
                            onClick={() => {
                              onPassageFilterChange("with");
                              setOpenDropdown(null);
                            }}
                          >
                            Có ngữ liệu
                          </button>
                          <button
                            type="button"
                            className={styles.menuButton}
                            disabled={passageFilter === "without"}
                            onClick={() => {
                              onPassageFilterChange("without");
                              setOpenDropdown(null);
                            }}
                          >
                            Không có ngữ liệu
                          </button>
                        </div>
                      </div>,
                      document.body,
                    )
                  : null}
              </div>
            </th>
            <th
              scope="col"
              aria-sort={
                (sortBy === "difficulty"
                  ? sortDir === "asc"
                    ? "ascending"
                    : "descending"
                  : "none") as "ascending" | "descending" | "none"
              }
            >
              <div className={styles.th} data-dropdown-root>
                <button
                  type="button"
                  className={`${styles.sortButton} ${
                    sortBy === "difficulty" ? styles.sortButtonActive : ""
                  }`}
                  onClick={() => handleSortToggle("difficulty")}
                  disabled={isLoading}
                  title="Sắp xếp theo độ khó"
                >
                  <span>Độ khó</span>
                </button>
                <button
                  type="button"
                  className={`${styles.filterButton} ${
                    hasDifficultyFilter ? styles.filterButtonActive : ""
                  }`}
                  aria-label="Lọc theo độ khó"
                  aria-expanded={openDropdown === "difficulty"}
                  onClick={() => toggleDropdown("difficulty")}
                  disabled={isLoading}
                  ref={difficultyFilterRef}
                >
                  <FunnelSimple
                    size={16}
                    weight={hasDifficultyFilter ? "bold" : "regular"}
                  />
                </button>
                {mounted && openDropdown === "difficulty" && filterMenuStyle
                  ? createPortal(
                      <div
                        className={styles.menuPanel}
                        role="dialog"
                        aria-label="Bộ lọc độ khó"
                        style={filterMenuStyle}
                        data-dropdown-root
                      >
                        <div className={styles.menuSection}>
                          <div className={styles.menuTitle}>Sắp xếp</div>
                          <button
                            type="button"
                            className={styles.menuButton}
                            onClick={() => {
                              onSortChange("difficulty", "asc");
                              setOpenDropdown(null);
                            }}
                          >
                            Tăng dần
                          </button>
                          <button
                            type="button"
                            className={styles.menuButton}
                            onClick={() => {
                              onSortChange("difficulty", "desc");
                              setOpenDropdown(null);
                            }}
                          >
                            Giảm dần
                          </button>
                          <button
                            type="button"
                            className={styles.menuButton}
                            disabled={
                              sortBy === "updatedAt" && sortDir === "desc"
                            }
                            onClick={() => {
                              onSortChange("updatedAt", "desc");
                              setOpenDropdown(null);
                            }}
                          >
                            Mặc định
                          </button>
                        </div>

                        <div
                          className={styles.menuDivider}
                          role="presentation"
                        />

                        <div className={styles.menuSection}>
                          <div className={styles.menuTitle}>Lọc</div>
                          <button
                            type="button"
                            className={styles.menuButton}
                            disabled={!hasDifficultyFilter}
                            onClick={() =>
                              onDifficultyLevelsChange([...difficultyOptions])
                            }
                          >
                            Tất cả
                          </button>
                          <fieldset
                            className={styles.menuList}
                            aria-label="Độ khó"
                          >
                            {difficultyOptions.map((level) => (
                              <label key={level} className={styles.ck}>
                                <input
                                  type="checkbox"
                                  checked={difficultyLevels.includes(level)}
                                  onChange={() => toggleDifficulty(level)}
                                />
                                {level} ★
                              </label>
                            ))}
                          </fieldset>
                        </div>
                      </div>,
                      document.body,
                    )
                  : null}
              </div>
            </th>
            <th
              scope="col"
              aria-sort={
                (sortBy === "status"
                  ? sortDir === "asc"
                    ? "ascending"
                    : "descending"
                  : "none") as "ascending" | "descending" | "none"
              }
            >
              <div className={styles.th} data-dropdown-root>
                <button
                  type="button"
                  className={`${styles.sortButton} ${
                    sortBy === "status" ? styles.sortButtonActive : ""
                  }`}
                  onClick={() => handleSortToggle("status")}
                  disabled={isLoading}
                  title="Sắp xếp theo trạng thái"
                >
                  <span>Trạng thái</span>
                </button>
                <button
                  type="button"
                  className={`${styles.filterButton} ${
                    hasStatusFilter ? styles.filterButtonActive : ""
                  }`}
                  aria-label="Lọc theo trạng thái"
                  aria-expanded={openDropdown === "status"}
                  onClick={() => toggleDropdown("status")}
                  disabled={isLoading}
                  ref={statusFilterRef}
                >
                  <FunnelSimple
                    size={16}
                    weight={hasStatusFilter ? "bold" : "regular"}
                  />
                </button>
                {mounted && openDropdown === "status" && filterMenuStyle
                  ? createPortal(
                      <div
                        className={styles.menuPanel}
                        role="dialog"
                        aria-label="Bộ lọc trạng thái"
                        style={filterMenuStyle}
                        data-dropdown-root
                      >
                        <div className={styles.menuSection}>
                          <div className={styles.menuTitle}>Sắp xếp</div>
                          <button
                            type="button"
                            className={styles.menuButton}
                            onClick={() => {
                              onSortChange("status", "asc");
                              setOpenDropdown(null);
                            }}
                          >
                            Tăng dần
                          </button>
                          <button
                            type="button"
                            className={styles.menuButton}
                            onClick={() => {
                              onSortChange("status", "desc");
                              setOpenDropdown(null);
                            }}
                          >
                            Giảm dần
                          </button>
                          <button
                            type="button"
                            className={styles.menuButton}
                            disabled={
                              sortBy === "updatedAt" && sortDir === "desc"
                            }
                            onClick={() => {
                              onSortChange("updatedAt", "desc");
                              setOpenDropdown(null);
                            }}
                          >
                            Mặc định
                          </button>
                        </div>

                        <div
                          className={styles.menuDivider}
                          role="presentation"
                        />

                        <div className={styles.menuSection}>
                          <div className={styles.menuTitle}>Lọc</div>
                          <button
                            type="button"
                            className={styles.menuButton}
                            disabled={!hasStatusFilter}
                            onClick={() => onStatusesChange(["active"])}
                          >
                            Mặc định (Hoạt động)
                          </button>
                          <fieldset
                            className={styles.menuList}
                            aria-label="Trạng thái"
                          >
                            <label className={styles.ck}>
                              <input
                                type="checkbox"
                                checked={statuses.includes("active")}
                                onChange={() => toggleStatus("active")}
                              />
                              Đang hoạt động
                            </label>
                            <label className={styles.ck}>
                              <input
                                type="checkbox"
                                checked={statuses.includes("archived")}
                                onChange={() => toggleStatus("archived")}
                              />
                              Đã lưu trữ
                            </label>
                          </fieldset>
                        </div>
                      </div>,
                      document.body,
                    )
                  : null}
              </div>
            </th>
            <th
              scope="col"
              aria-sort={
                (sortBy === "updatedAt"
                  ? sortDir === "asc"
                    ? "ascending"
                    : "descending"
                  : "none") as "ascending" | "descending" | "none"
              }
            >
              <button
                type="button"
                className={`${styles.sortButton} ${
                  sortBy === "updatedAt" ? styles.sortButtonActive : ""
                }`}
                onClick={() => handleSortToggle("updatedAt")}
                disabled={isLoading}
                title="Sắp xếp theo cập nhật"
              >
                <span>Cập nhật</span>
                <span className={styles.sortIcon} aria-hidden="true">
                  {sortBy === "updatedAt" ? (
                    sortDir === "asc" ? (
                      <CaretUp weight="bold" size={16} />
                    ) : (
                      <CaretDown weight="bold" size={16} />
                    )
                  ) : (
                    <>
                      <CaretUp size={12} />
                      <CaretDown size={12} />
                    </>
                  )}
                </span>
              </button>
            </th>
            <th scope="col">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {error ? (
            <tr>
              <td colSpan={8}>
                <div className={styles.stateCard} role="alert">
                  {error}
                  <div>
                    <button
                      className={styles.stateAction}
                      type="button"
                      onClick={onRetry}
                    >
                      Thử lại
                    </button>
                  </div>
                </div>
              </td>
            </tr>
          ) : !items.length ? (
            <tr>
              <td colSpan={8}>
                <div className={styles.stateCard} aria-live="polite">
                  {isLoading
                    ? "Đang tải câu hỏi..."
                    : "Không có câu hỏi phù hợp."}
                </div>
              </td>
            </tr>
          ) : (
            items.map((q) => {
              const subject = subjectMap.get(q.subjectId);
              const rowBusy = mutating?.questionId === q.id;
              const busy = rowBusy ? mutating?.action : null;
              const dateLabel = formatDateVi(q.updatedAt ?? q.createdAt);
              const editHref = q.passageId
                ? {
                    pathname: `/staff/questions/passages/${q.passageId}`,
                    query: { questionId: q.id },
                  }
                : { pathname: `/staff/questions/${q.id}` };
              return (
                <tr key={q.id}>
                  <td className={styles.stem}>{q.stem}</td>
                  <td>{subject?.name ?? "—"}</td>
                  <td>
                    <span className={`${styles.pill} ${styles.pillGray}`}>
                      {questionTypeLabel(q.type)}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`${styles.pill} ${
                        q.passageId ? styles.pillBlue : styles.pillGray
                      }`}
                    >
                      {q.passageId ? "Có" : "Không"}
                    </span>
                  </td>
                  <td>
                    <span className={`${styles.pill} ${styles.pillBlue}`}>
                      {q.defaultDifficulty} ★
                    </span>
                  </td>
                  <td>
                    <span
                      className={`${styles.pill} ${
                        q.status === "archived"
                          ? styles.pillGray
                          : styles.pillBlue
                      }`}
                    >
                      {q.status === "archived" ? "Lưu trữ" : "Hoạt động"}
                    </span>
                  </td>
                  <td>{dateLabel}</td>
                  <td>
                    <div className={styles.actionMenu} data-dropdown-root>
                      <button
                        type="button"
                        className={styles.actionMenuTrigger}
                        aria-label="Mở menu thao tác"
                        aria-expanded={openActionMenuId === q.id}
                        onClick={() => toggleActionMenu(q.id)}
                        disabled={rowBusy}
                        ref={setActionMenuRef(q.id)}
                      >
                        <DotsThreeVertical size={16} weight="bold" />
                      </button>
                      {mounted && openActionMenuId === q.id && actionMenuStyle
                        ? createPortal(
                            <div
                              className={styles.actionMenuPanel}
                              role="dialog"
                              aria-label="Thao tác câu hỏi"
                              style={actionMenuStyle}
                              data-dropdown-root
                            >
                              <Link
                                className={styles.actionMenuItem}
                                href={editHref}
                                onClick={() => setOpenActionMenuId(null)}
                              >
                                Sửa
                              </Link>
                              {q.status === "archived" ? (
                                <button
                                  type="button"
                                  className={styles.actionMenuItem}
                                  disabled={rowBusy}
                                  onClick={() => {
                                    setOpenActionMenuId(null);
                                    void patchStatus(q.id, "active");
                                  }}
                                >
                                  {busy === "restore"
                                    ? "Đang khôi phục..."
                                    : "Khôi phục"}
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className={styles.actionMenuItem}
                                  disabled={rowBusy}
                                  onClick={() => {
                                    setOpenActionMenuId(null);
                                    void patchStatus(q.id, "archived");
                                  }}
                                >
                                  {busy === "archive" ? "Lưu trữ" : "Lưu trữ"}
                                </button>
                              )}
                              <div
                                className={styles.actionMenuDivider}
                                role="presentation"
                              />
                              <button
                                type="button"
                                className={`${styles.actionMenuItem} ${styles.actionMenuItemDanger}`}
                                disabled={rowBusy}
                                onClick={() => {
                                  setOpenActionMenuId(null);
                                  requestDeleteQuestion(q.id);
                                }}
                              >
                                {busy === "delete" ? "Đang xóa..." : "Xóa"}
                              </button>
                            </div>,
                            document.body,
                          )
                        : null}
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      <ConfirmModal
        open={deleteCandidateId !== null}
        title="Xóa câu hỏi?"
        message="Xóa câu hỏi này? Nếu câu hỏi đang được dùng trong quiz, bạn sẽ không thể xóa."
        confirmLabel="Xóa"
        cancelLabel="Hủy"
        confirmVariant="danger"
        disableConfirm={mutating !== null}
        onCancel={() => setDeleteCandidateId(null)}
        onConfirm={() => {
          const targetId = deleteCandidateId;
          setDeleteCandidateId(null);
          if (!targetId) return;
          void deleteQuestionConfirmed(targetId);
        }}
      />
      <NoticeModal
        open={rowError !== null}
        title="Không thể thao tác"
        message={rowError?.message ?? ""}
        tone="error"
        closeLabel="Đóng"
        onClose={() => setRowError(null)}
      />
    </div>
  );
}

function questionTypeLabel(type: QuestionType) {
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

function setsEqual<T extends string | number>(
  a: readonly T[],
  b: readonly T[],
) {
  if (a.length !== b.length) return false;
  const setA = new Set(a);
  if (setA.size !== a.length) return false;
  return b.every((value) => setA.has(value));
}

function defaultSortDirFor(sortBy: QuestionSortBy): QuestionSortDir {
  switch (sortBy) {
    case "createdAt":
    case "difficulty":
    case "updatedAt":
      return "desc";
    default:
      return "asc";
  }
}
