"use client";

import { SpinnerGap } from "phosphor-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RichText } from "@/components/ui/rich-text";
import { formatRelativeTimeVi } from "@/lib/formatters";
import styles from "./profile-score-cards.module.css";

type Access = {
  allowed: boolean;
  reason: "ok" | "not_paid" | "llm_unconfigured";
};

type Summary = {
  status: "pending" | "processing" | "failed" | "completed";
  summaryMarkdown: string | null;
  errorMessage: string | null;
  requestedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  updatedAt: string;
};

type GetResponse = {
  access: Access;
  eligible: boolean;
  summary: Summary | null;
};

type PostResponse = {
  access: Access;
  summary: Summary;
};

function accessMessage(access: Access) {
  if (access.allowed) return null;
  if (access.reason === "not_paid") {
    return "Chỉ dành cho tài khoản trả phí. Liên hệ quản trị viên để nâng cấp gói.";
  }
  if (access.reason === "llm_unconfigured") {
    return "AI hiện chưa được cấu hình. Vui lòng liên hệ quản trị viên.";
  }
  return "AI hiện không sẵn sàng.";
}

function statusLabel(status: Summary["status"]) {
  switch (status) {
    case "pending":
    case "processing":
      return "Đang tạo";
    case "failed":
      return "Lỗi";
    case "completed":
      return "AI";
    default:
      return "AI";
  }
}

export function ProfileAiSuggestionCard() {
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [access, setAccess] = useState<Access>({
    allowed: true,
    reason: "ok",
  });
  const [eligible, setEligible] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);

  const didAutoRequestRef = useRef(false);

  const blockedMessage = useMemo(() => accessMessage(access), [access]);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/profile/ai-summary", {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      const data: GetResponse = await res.json();
      if (!res.ok) {
        throw new Error(
          (data as unknown as { error?: string }).error ?? "failed",
        );
      }
      setAccess(data.access);
      setEligible(Boolean(data.eligible));
      setSummary(data.summary);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Không thể tải gợi ý AI",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const requestGeneration = useCallback(async () => {
    if (requesting) return;
    setRequesting(true);
    setError(null);
    try {
      const res = await fetch("/api/profile/ai-summary", {
        method: "POST",
        headers: { Accept: "application/json" },
      });
      const data: PostResponse = await res.json();
      if (!res.ok) {
        throw new Error(
          (data as unknown as { error?: string }).error ?? "failed",
        );
      }
      setAccess(data.access);
      setSummary(data.summary);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Không thể yêu cầu tạo gợi ý AI",
      );
    } finally {
      setRequesting(false);
    }
  }, [requesting]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (loading) return;
    if (didAutoRequestRef.current) return;
    if (!access.allowed) return;
    if (!eligible) return;
    if (summary) return;
    didAutoRequestRef.current = true;
    void requestGeneration();
  }, [access.allowed, eligible, loading, requestGeneration, summary]);

  const status = summary?.status ?? null;
  const showSpinner =
    requesting || status === "pending" || status === "processing";

  const titleText = useMemo(() => {
    if (blockedMessage) return "Chiến lược học tập (Premium)";
    return "Chiến lược học tập";
  }, [blockedMessage]);

  const badgeText = useMemo(() => {
    if (blockedMessage) return "Premium";
    if (status) return statusLabel(status);
    return "AI";
  }, [blockedMessage, status]);

  const updatedLabel = summary?.completedAt
    ? `Cập nhật: ${formatRelativeTimeVi(summary.completedAt)}`
    : summary?.requestedAt
      ? `Yêu cầu: ${formatRelativeTimeVi(summary.requestedAt)}`
      : null;

  return (
    <section className={styles.aiCard} aria-label="Chiến lược học tập">
      <div className={styles.aiTitleRow}>
        <h3 className={styles.aiTitle}>{titleText}</h3>
        <span className={styles.aiTag}>{badgeText}</span>
      </div>

      {loading ? (
        <p className={styles.aiBody}>
          <span className="inline-flex items-center gap-2">
            <SpinnerGap size={16} className="animate-spin" />
            Đang tải…
          </span>
        </p>
      ) : blockedMessage ? (
        <p className={styles.aiBody}>{blockedMessage}</p>
      ) : !eligible ? (
        <p className={styles.aiBody}>
          Hãy hoàn thành vài bài quiz để AI tạo gợi ý học tập cá nhân hoá cho
          bạn.
        </p>
      ) : summary?.status === "completed" && summary.summaryMarkdown ? (
        <>
          <div className={styles.aiBody}>
            <RichText content={summary.summaryMarkdown} allowLinks={false} />
          </div>
          <p className={styles.aiBody}>
            Nội dung do AI tạo, có thể sai. Hãy kiểm chứng với tài liệu/chuyên
            gia.
          </p>
        </>
      ) : summary?.status === "failed" ? (
        <p className={styles.aiBody}>
          Không thể tạo gợi ý lúc này.{" "}
          {summary.errorMessage ? `(${summary.errorMessage})` : null}
        </p>
      ) : (
        <p className={styles.aiBody}>
          {showSpinner ? (
            <span className="inline-flex items-center gap-2">
              <SpinnerGap size={16} className="animate-spin" />
              Đang tạo gợi ý… Bạn có thể quay lại sau để xem.
            </span>
          ) : (
            "Đang tạo gợi ý… Bạn có thể quay lại sau để xem."
          )}
        </p>
      )}

      {error ? <p className={styles.aiBody}>{error}</p> : null}

      <div className={styles.aiButtonRow}>
        <button
          type="button"
          className={`${styles.aiButton} ${styles.aiButtonSecondary}`}
          onClick={() => void reload()}
          disabled={loading || requesting}
        >
          Tải lại
        </button>
        {!blockedMessage &&
        eligible &&
        (summary?.status === "failed" || summary === null) ? (
          <button
            type="button"
            className={styles.aiButton}
            onClick={() => void requestGeneration()}
            disabled={loading || requesting}
          >
            {requesting ? "Đang yêu cầu..." : "Thử lại"}
          </button>
        ) : null}
      </div>

      {updatedLabel ? (
        <div className={styles.aiBody}>{updatedLabel}</div>
      ) : null}
    </section>
  );
}
