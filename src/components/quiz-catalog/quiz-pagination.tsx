"use client";

import styles from "./quiz-catalog.module.css";

type QuizPaginationProps = {
  page: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
};

export function QuizPagination({
  page,
  totalItems,
  pageSize,
  onPageChange,
}: QuizPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  if (totalPages <= 1) return null;

  const pages = buildPages(page, totalPages);

  return (
    <nav className={styles.pager} aria-label="Pagination">
      <button
        type="button"
        className={`${styles.pagerButton} ${
          page <= 1 ? styles.pagerButtonDisabled : ""
        }`}
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        Trước
      </button>

      {pages.map((item) =>
        typeof item === "string" ? (
          <span key={item} className={styles.pagerEllipsis}>
            ...
          </span>
        ) : (
          <button
            key={item}
            type="button"
            className={`${styles.pagerButton} ${
              item === page ? styles.pagerButtonActive : ""
            }`}
            aria-current={item === page ? "page" : undefined}
            onClick={() => onPageChange(item)}
          >
            {item}
          </button>
        ),
      )}

      <button
        type="button"
        className={`${styles.pagerButton} ${
          page >= totalPages ? styles.pagerButtonDisabled : ""
        }`}
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Sau
      </button>
    </nav>
  );
}

function buildPages(current: number, total: number) {
  const pages = new Set<number>();
  pages.add(1);
  pages.add(total);
  pages.add(current);
  pages.add(current - 1);
  pages.add(current + 1);

  const sorted = Array.from(pages)
    .filter((page) => page >= 1 && page <= total)
    .sort((a, b) => a - b);

  const result: Array<number | string> = [];
  let prev = 0;
  sorted.forEach((page) => {
    if (prev && page - prev > 1) {
      result.push(`ellipsis-${prev}-${page}`);
    }
    result.push(page);
    prev = page;
  });
  return result;
}
