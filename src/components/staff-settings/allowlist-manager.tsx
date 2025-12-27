"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { AllowlistEntry } from "@/application/models/userAdmin";
import { QuizPagination } from "@/components/quiz-catalog/quiz-pagination";
import { formatDateVi } from "@/lib/formatters";
import styles from "./allowlist-manager.module.css";

type AllowlistManagerProps = {
  initialItems: AllowlistEntry[];
  initialTotal: number;
};

type Notice = { tone: "success" | "error"; message: string };

const PAGE_SIZE = 50;

export function AllowlistManager({
  initialItems,
  initialTotal,
}: AllowlistManagerProps) {
  const [items, setItems] = useState<AllowlistEntry[]>(initialItems);
  const [total, setTotal] = useState<number>(initialTotal);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 250);
  const [page, setPage] = useState(1);
  const [emails, setEmails] = useState("");
  const [role, setRole] = useState<"student" | "staff">("student");
  const [tier, setTier] = useState<"paid" | "free">("paid");
  const [mutating, setMutating] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        const params = new URLSearchParams();
        params.set("limit", String(PAGE_SIZE));
        params.set("offset", String((page - 1) * PAGE_SIZE));
        if (debouncedQuery.trim()) params.set("search", debouncedQuery.trim());
        params.set("_", String(refreshKey));

        const res = await fetch(`/api/staff/allowlist?${params}`, {
          signal: controller.signal,
        });
        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          throw new Error(payload?.error ?? "Không thể tải allowlist");
        }
        const payload = await res.json();
        setItems(
          Array.isArray(payload.items)
            ? (payload.items as AllowlistEntry[])
            : [],
        );
        setTotal(Number(payload.total ?? 0));
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError(
          err instanceof Error ? err.message : "Không thể tải allowlist",
        );
      } finally {
        setLoading(false);
      }
    };
    run();
    return () => controller.abort();
  }, [debouncedQuery, page, refreshKey]);

  const caption = useMemo(() => {
    if (total <= 0) return "0 mục";
    const start = (page - 1) * PAGE_SIZE + 1;
    const end = Math.min(total, page * PAGE_SIZE);
    return `${start}-${end} / ${total} mục`;
  }, [page, total]);

  const submit = async () => {
    const parsed = parseEmailList(emails);
    if (!parsed.valid.length) {
      setNotice({ tone: "error", message: "Vui lòng nhập email hợp lệ." });
      return;
    }
    if (parsed.invalid.length) {
      setNotice({
        tone: "error",
        message: `Email không hợp lệ: ${parsed.invalid.slice(0, 5).join(", ")}${
          parsed.invalid.length > 5 ? "…" : ""
        }`,
      });
      return;
    }

    setNotice(null);
    setMutating(true);
    try {
      const body =
        parsed.valid.length === 1
          ? { email: parsed.valid[0], role, tier }
          : {
              entries: parsed.valid.map((email) => ({ email, role, tier })),
            };

      const res = await fetch("/api/staff/allowlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error ?? "Không thể cập nhật allowlist");
      }
      const payload = await res.json().catch(() => ({}));
      const added =
        typeof payload?.added === "number" ? Number(payload.added) : null;
      setNotice({
        tone: "success",
        message:
          added !== null
            ? `Đã thêm ${added} email vào allowlist.`
            : "Đã thêm email vào allowlist.",
      });
      setEmails("");
      setPage(1);
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      setNotice({
        tone: "error",
        message:
          err instanceof Error ? err.message : "Không thể cập nhật allowlist",
      });
    } finally {
      setMutating(false);
    }
  };

  const remove = async (email: string) => {
    const ok = window.confirm(`Gỡ khỏi allowlist: ${email}?`);
    if (!ok) return;
    setNotice(null);
    setMutating(true);
    try {
      const res = await fetch("/api/staff/allowlist", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error ?? "Không thể gỡ khỏi allowlist");
      }
      setNotice({ tone: "success", message: "Đã gỡ khỏi allowlist." });
      setPage(1);
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      setNotice({
        tone: "error",
        message: err instanceof Error ? err.message : "Không thể gỡ allowlist",
      });
    } finally {
      setMutating(false);
    }
  };

  return (
    <div className={styles.wrap} aria-busy={loading}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Allowlist</h2>
          <p className={styles.subtitle}>
            Email trong allowlist sẽ được auto-activate khi đăng ký. Có thể gán
            role <b>staff</b> để cấp quyền quản trị.
          </p>
        </div>
        <button
          type="button"
          className={styles.refreshBtn}
          onClick={() => setRefreshKey((prev) => prev + 1)}
          disabled={loading}
        >
          Làm mới
        </button>
      </div>

      {notice ? (
        <div
          className={`${styles.notice} ${
            notice.tone === "success"
              ? styles.noticeSuccess
              : styles.noticeError
          }`}
          role={notice.tone === "error" ? "alert" : "status"}
        >
          {notice.message}
        </div>
      ) : null}

      <div className={styles.form}>
        <label className={styles.field}>
          <span className={styles.label}>Email (mỗi dòng 1 email)</span>
          <textarea
            ref={textareaRef}
            className={styles.textarea}
            rows={3}
            value={emails}
            onChange={(event) => setEmails(event.target.value)}
            placeholder="student.1@baihoc.dev&#10;staff@baihoc.dev"
          />
        </label>

        <div className={styles.formRow}>
          <label className={styles.fieldInline}>
            <span className={styles.label}>Role</span>
            <select
              className={styles.select}
              value={role}
              onChange={(event) =>
                setRole(event.target.value as "student" | "staff")
              }
            >
              <option value="student">Học sinh</option>
              <option value="staff">Giáo viên</option>
            </select>
          </label>

          <label className={styles.fieldInline}>
            <span className={styles.label}>Tier</span>
            <select
              className={styles.select}
              value={tier}
              onChange={(event) =>
                setTier(event.target.value as "paid" | "free")
              }
            >
              <option value="paid">Trả phí</option>
              <option value="free">Miễn phí</option>
            </select>
          </label>

          <div className={styles.formActions}>
            <button
              type="button"
              className={styles.primary}
              disabled={mutating}
              onClick={submit}
            >
              {mutating ? "Đang lưu..." : "Thêm / cập nhật"}
            </button>
          </div>
        </div>
      </div>

      <div className={styles.searchRow}>
        <label className={styles.searchField}>
          <span className={styles.searchLabel}>Tìm email</span>
          <input
            className={styles.searchInput}
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="VD: @baihoc.dev"
          />
        </label>
        <div className={styles.count}>{caption}</div>
      </div>

      {error ? (
        <div className={styles.stateCard} role="alert">
          {error}
          <div>
            <button
              className={styles.stateAction}
              type="button"
              onClick={() => setRefreshKey((prev) => prev + 1)}
            >
              Thử lại
            </button>
          </div>
        </div>
      ) : !items.length ? (
        <div className={styles.stateCard} aria-live="polite">
          {loading ? "Đang tải..." : "Không có email phù hợp."}
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table} aria-label="Allowlist table">
            <thead>
              <tr>
                <th scope="col">Email</th>
                <th scope="col">Role</th>
                <th scope="col">Tier</th>
                <th scope="col">Added by</th>
                <th scope="col">Ngày tạo</th>
                <th scope="col">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.email}>
                  <td className={styles.emailCell}>{item.email}</td>
                  <td>
                    <span className={`${styles.pill} ${styles.pillGray}`}>
                      {roleLabel(item.role)}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`${styles.pill} ${
                        item.tier === "paid" ? styles.pillBlue : styles.pillGray
                      }`}
                    >
                      {tierLabel(item.tier)}
                    </span>
                  </td>
                  <td>
                    {item.addedBy ? (
                      <Link
                        className={styles.addedByLink}
                        href={`/profile/${item.addedBy}`}
                      >
                        {shortId(item.addedBy)}
                      </Link>
                    ) : (
                      <span className={styles.subtle}>—</span>
                    )}
                  </td>
                  <td>{formatDateVi(item.createdAt)}</td>
                  <td>
                    <div className={styles.rowActions}>
                      <button
                        type="button"
                        className={styles.linkBtn}
                        disabled={mutating}
                        onClick={() => {
                          setEmails(item.email);
                          setRole(item.role);
                          setTier(item.tier);
                          textareaRef.current?.focus();
                          textareaRef.current?.scrollIntoView({
                            behavior: "smooth",
                            block: "center",
                          });
                        }}
                      >
                        Sửa
                      </button>
                      <button
                        type="button"
                        className={styles.linkBtn}
                        disabled={mutating}
                        onClick={() => {
                          const link = `${window.location.origin}/auth/register?email=${encodeURIComponent(
                            item.email,
                          )}`;
                          void copyText(
                            link,
                            setNotice,
                            "Đã copy link đăng ký.",
                          );
                        }}
                      >
                        Copy link
                      </button>
                      <button
                        type="button"
                        className={`${styles.linkBtn} ${styles.linkBtnRed}`}
                        disabled={mutating}
                        onClick={() => remove(item.email)}
                      >
                        Gỡ
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {total > PAGE_SIZE ? (
        <div className={styles.pagerRow}>
          <QuizPagination
            page={page}
            totalItems={total}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
          />
        </div>
      ) : null}
    </div>
  );
}

function roleLabel(role: AllowlistEntry["role"]) {
  return role === "staff" ? "Giáo viên" : "Học sinh";
}

function tierLabel(tier: AllowlistEntry["tier"]) {
  return tier === "paid" ? "Trả phí" : "Miễn phí";
}

function shortId(value: string) {
  if (value.length <= 12) return value;
  return `${value.slice(0, 8)}…${value.slice(-4)}`;
}

function parseEmailList(raw: string) {
  const tokens = raw
    .split(/[\s,;\n]+/g)
    .map((value) => value.trim())
    .filter(Boolean);
  const unique = new Set<string>();
  const invalid: string[] = [];
  for (const token of tokens) {
    const email = token.toLowerCase();
    if (!isValidEmail(email)) {
      invalid.push(token);
      continue;
    }
    unique.add(email);
  }
  return { valid: Array.from(unique), invalid };
}

function isValidEmail(value: string) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value);
}

function useDebouncedValue<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

async function copyText(
  value: string,
  setNotice: (notice: Notice | null) => void,
  successMessage: string,
) {
  try {
    await navigator.clipboard.writeText(value);
    setNotice({ tone: "success", message: successMessage });
  } catch {
    window.prompt("Copy", value);
  }
}
