"use client";

import { usePathname, useRouter } from "next/navigation";
import { ArrowSquareOut, PaperPlaneRight, SpinnerGap, X } from "phosphor-react";
import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { RichText } from "@/components/ui/rich-text";
import styles from "./ai-chat.module.css";

type Props = {
  onClose: () => void;
};

type EntryPoint = "home" | "result" | "question";

type Access = {
  allowed: boolean;
  reason: "ok" | "not_paid" | "llm_unconfigured";
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
};

type SessionStateResponse = {
  access: Access;
  session: { id: string; entryPoint: EntryPoint; createdAt: string } | null;
  messages: ChatMessage[];
};

type SendMessageResponse = {
  access: Access;
  sessionId: string;
  reply: string;
};

function deriveContext(pathname: string): {
  entryPoint: EntryPoint;
  attemptId: string | null;
} {
  const match = pathname.match(
    /^\/attempts\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/results\/?$/i,
  );
  if (match?.[1]) {
    return { entryPoint: "result", attemptId: match[1] };
  }
  return { entryPoint: "home", attemptId: null };
}

function storageKeyForContext(ctx: {
  entryPoint: EntryPoint;
  attemptId: string | null;
}) {
  return `baihoc_ai_session_${ctx.entryPoint}_${ctx.attemptId ?? "none"}`;
}

function nowIso() {
  return new Date().toISOString();
}

export function AiChatDialog({ onClose }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const context = useMemo(() => deriveContext(pathname), [pathname]);
  const storageKey = useMemo(() => storageKeyForContext(context), [context]);

  const [access, setAccess] = useState<Access>({
    allowed: true,
    reason: "ok",
  });
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState("");

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const title =
    context.entryPoint === "result" ? "BaiHoc AI (Kết quả)" : "BaiHoc AI";
  const subtitle =
    context.entryPoint === "result"
      ? "Mình đã có ngữ cảnh bài làm để giải thích."
      : "Hỏi về lộ trình, điểm yếu, hoặc bất kỳ câu hỏi nào.";

  const accessMessage = useMemo(() => {
    if (access.allowed) return null;
    if (access.reason === "not_paid") {
      return "Tính năng AI chỉ dành cho tài khoản trả phí.";
    }
    if (access.reason === "llm_unconfigured") {
      return "AI hiện chưa được cấu hình. Vui lòng liên hệ quản trị viên.";
    }
    return "AI hiện không sẵn sàng.";
  }, [access.allowed, access.reason]);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, []);

  useEffect(() => {
    if (messages.length === 0) return;
    scrollToBottom();
  }, [messages.length, scrollToBottom]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const stored =
          typeof window !== "undefined"
            ? localStorage.getItem(storageKey)
            : null;

        const qs = new URLSearchParams({
          entryPoint: context.entryPoint,
        });
        if (context.attemptId) qs.set("attemptId", context.attemptId);
        if (stored) qs.set("sessionId", stored);

        const res = await fetch(`/api/ai/session?${qs.toString()}`, {
          method: "GET",
          headers: { Accept: "application/json" },
        });
        const data: SessionStateResponse = await res.json();
        if (!res.ok) {
          throw new Error(
            (data as unknown as { error?: string }).error ?? "failed",
          );
        }
        if (cancelled) return;

        setAccess(data.access);
        setMessages(data.messages);
        const nextSessionId = data.session?.id ?? null;
        setSessionId(nextSessionId);
        if (nextSessionId) {
          localStorage.setItem(storageKey, nextSessionId);
        }
      } catch (loadError) {
        if (cancelled) return;
        const message =
          loadError instanceof Error ? loadError.message : "Không thể tải chat";
        setError(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [context.attemptId, context.entryPoint, storageKey]);

  const canSend = access.allowed && !sending && input.trim().length > 0;

  const handleSend = useCallback(async () => {
    if (!canSend) return;

    const trimmed = input.trim();
    setInput("");
    textareaRef.current?.focus();
    setError(null);

    const optimisticUser: ChatMessage = {
      id: `local-user-${nowIso()}`,
      role: "user",
      content: trimmed,
      createdAt: nowIso(),
    };
    setMessages((prev) => [...prev, optimisticUser]);
    setSending(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entryPoint: context.entryPoint,
          attemptId: context.attemptId,
          sessionId,
          message: trimmed,
        }),
      });

      const data: SendMessageResponse = await res.json();
      if (!res.ok) {
        throw new Error(
          (data as unknown as { error?: string }).error ?? "failed",
        );
      }

      setAccess(data.access);
      setSessionId(data.sessionId);
      localStorage.setItem(storageKey, data.sessionId);
      setMessages((prev) => [
        ...prev,
        {
          id: `local-assistant-${nowIso()}`,
          role: "assistant",
          content: data.reply,
          createdAt: nowIso(),
        },
      ]);
    } catch (sendError) {
      const message =
        sendError instanceof Error ? sendError.message : "Không thể gửi tới AI";
      setError(message);
      setMessages((prev) => [
        ...prev,
        {
          id: `local-error-${nowIso()}`,
          role: "system",
          content: "AI hiện không sẵn sàng. Vui lòng thử lại sau.",
          createdAt: nowIso(),
        },
      ]);
    } finally {
      setSending(false);
    }
  }, [
    canSend,
    context.attemptId,
    context.entryPoint,
    input,
    sessionId,
    storageKey,
  ]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    handleSend();
  };

  const handleOpenFullPage = useCallback(() => {
    const qs = new URLSearchParams();
    qs.set("from", pathname);
    if (sessionId) qs.set("sessionId", sessionId);
    router.push(`/ai?${qs.toString()}`);
    onClose();
  }, [onClose, pathname, router, sessionId]);

  const body = (
    <>
      {!messages.length ? (
        <div className={`${styles.messageRow} ${styles.messageAssistant}`}>
          <div className={`${styles.messageBubble} ${styles.bubbleSystem}`}>
            Gợi ý: “Phân tích điểm yếu của mình và lập kế hoạch học 7 ngày”,
            hoặc “Giải thích vì sao mình sai câu 3”.
          </div>
        </div>
      ) : null}

      {messages.map((message) => {
        const rowClass =
          message.role === "user"
            ? styles.messageUser
            : styles.messageAssistant;
        const bubbleClass =
          message.role === "user"
            ? styles.bubbleUser
            : message.role === "assistant"
              ? styles.bubbleAssistant
              : styles.bubbleSystem;
        const content =
          message.role === "assistant" ? (
            <RichText content={message.content} allowLinks={false} />
          ) : (
            message.content
          );
        return (
          <div key={message.id} className={`${styles.messageRow} ${rowClass}`}>
            <div className={`${styles.messageBubble} ${bubbleClass}`}>
              {content}
            </div>
          </div>
        );
      })}

      {sending ? (
        <div className={`${styles.messageRow} ${styles.messageAssistant}`}>
          <div className={`${styles.messageBubble} ${styles.bubbleAssistant}`}>
            <span className="inline-flex items-center gap-2">
              <SpinnerGap size={16} className="animate-spin" /> Đang trả lời…
            </span>
          </div>
        </div>
      ) : null}

      <div ref={bottomRef} />
    </>
  );

  return (
    <section className={styles.dialog} aria-label="AI chat">
      <header className={styles.header}>
        <div className={styles.headerTitle}>
          <div className={styles.headerNameRow}>
            <div className={styles.headerBadge}>AI</div>
            <div className={styles.headerName}>{title}</div>
          </div>
          <div className={styles.headerSubtitle}>{subtitle}</div>
        </div>

        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.iconButton}
            onClick={handleOpenFullPage}
            aria-label="Mở toàn màn hình"
          >
            <ArrowSquareOut size={18} />
          </button>
          <button
            type="button"
            className={styles.iconButton}
            onClick={onClose}
            aria-label="Đóng chat"
          >
            <X size={18} />
          </button>
        </div>
      </header>

      <div className={styles.body}>
        {loading ? (
          <div className={`${styles.messageRow} ${styles.messageAssistant}`}>
            <div className={`${styles.messageBubble} ${styles.bubbleSystem}`}>
              Đang tải…
            </div>
          </div>
        ) : null}

        {!loading && accessMessage ? (
          <div className={`${styles.messageRow} ${styles.messageAssistant}`}>
            <div className={`${styles.messageBubble} ${styles.bubbleSystem}`}>
              {accessMessage}
            </div>
          </div>
        ) : null}

        {!loading && error ? (
          <div className={`${styles.messageRow} ${styles.messageAssistant}`}>
            <div className={`${styles.messageBubble} ${styles.bubbleSystem}`}>
              {error}
            </div>
          </div>
        ) : null}

        {!loading ? body : null}
      </div>

      <form className={styles.composer} onSubmit={handleSubmit}>
        <textarea
          ref={textareaRef}
          className={styles.textarea}
          placeholder={
            access.allowed ? "Nhập câu hỏi…" : "AI hiện không khả dụng…"
          }
          value={input}
          onChange={(event) => setInput(event.target.value)}
          disabled={!access.allowed || sending}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            if (event.shiftKey) return;
            event.preventDefault();
            handleSend();
          }}
        />
        <button
          type="submit"
          className={styles.sendButton}
          disabled={!canSend}
          aria-label="Gửi"
        >
          <PaperPlaneRight size={18} weight="bold" />
        </button>
      </form>

      <div className={styles.hint}>Nội dung do AI chỉ mang tính tham khảo.</div>
    </section>
  );
}
