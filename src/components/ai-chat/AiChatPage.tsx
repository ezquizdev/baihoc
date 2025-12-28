"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  List as ListIcon,
  Plus,
  SignOut,
  UserCircle,
} from "phosphor-react";
import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { RichText } from "@/components/ui/rich-text";
import { formatRelativeTimeVi } from "@/lib/formatters";
import { sanitizeNextPath } from "@/lib/urls";
import chatStyles from "./ai-chat.module.css";
import styles from "./ai-chat-page.module.css";

type EntryPoint = "home" | "result" | "question";
type Role = "student" | "staff";

type Access = {
  allowed: boolean;
  reason: "ok" | "not_paid" | "llm_unconfigured";
};

type SessionListItem = {
  id: string;
  entryPoint: EntryPoint;
  createdAt: string;
  quizTitle: string | null;
  attemptId: string | null;
  questionId: string | null;
  lastMessageAt: string | null;
  lastMessageRole: "user" | "assistant" | "system" | null;
  lastMessagePreview: string | null;
};

type SessionDetail = {
  id: string;
  entryPoint: EntryPoint;
  createdAt: string;
  quizTitle: string | null;
  attemptId: string | null;
  questionId: string | null;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
};

type ListResponse = {
  access: Access;
  items: SessionListItem[];
};

type ConversationResponse = {
  access: Access;
  session: SessionDetail | null;
  messages: ChatMessage[];
};

type CreateSessionResponse = {
  access: Access;
  session: SessionDetail;
};

type SendMessageResponse = {
  access: Access;
  sessionId: string;
  reply: string;
};

type Viewer = {
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  role: Role;
};

function displayNameFromViewer(viewer: Viewer) {
  if (viewer.fullName) return viewer.fullName;
  return viewer.email.split("@")[0] ?? viewer.email;
}

function nowIso() {
  return new Date().toISOString();
}

function sessionTitle(entryPoint: EntryPoint, quizTitle: string | null) {
  switch (entryPoint) {
    case "home":
      return "Hỏi chung";
    case "result":
      return `Kết quả: ${quizTitle ?? "Quiz"}`;
    case "question":
      return `Câu hỏi: ${quizTitle ?? "Quiz"}`;
  }
}

function accessMessage(access: Access) {
  if (access.allowed) return null;
  if (access.reason === "not_paid") {
    return "Tính năng AI chỉ dành cho tài khoản trả phí.";
  }
  if (access.reason === "llm_unconfigured") {
    return "AI hiện chưa được cấu hình. Vui lòng liên hệ quản trị viên.";
  }
  return "AI hiện không sẵn sàng.";
}

export function AiChatPage({
  viewer,
  initialFrom,
  initialSessions,
  initialConversation,
  initialSessionId,
}: {
  viewer: Viewer;
  initialFrom: string | null;
  initialSessions: ListResponse;
  initialConversation: ConversationResponse | null;
  initialSessionId: string | null;
}) {
  const router = useRouter();
  const name = useMemo(() => displayNameFromViewer(viewer), [viewer]);
  const from = useMemo(
    () => (initialFrom ? sanitizeNextPath(initialFrom) : null),
    [initialFrom],
  );

  const [access, setAccess] = useState<Access>(initialSessions.access);
  const [sessions, setSessions] = useState<SessionListItem[]>(
    initialSessions.items,
  );

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSession, setActiveSession] = useState<SessionDetail | null>(
    initialConversation?.session ?? null,
  );
  const [activeSessionId, setActiveSessionId] = useState<string | null>(
    initialConversation?.session?.id ?? null,
  );
  const [messages, setMessages] = useState<ChatMessage[]>(
    initialConversation?.messages ?? [],
  );

  const [loadingConversation, setLoadingConversation] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState("");

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const profileRef = useRef<HTMLDetailsElement | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  const backLabel = from ? "Quay lại" : "Quay lại";

  const updateUrl = useCallback(
    (sessionId: string | null) => {
      const qs = new URLSearchParams();
      if (from) qs.set("from", from);
      if (sessionId) qs.set("sessionId", sessionId);
      const suffix = qs.toString();
      router.replace(suffix ? `/ai?${suffix}` : "/ai");
    },
    [from, router],
  );

  const reloadSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/ai/sessions?limit=60", {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      const data: ListResponse = await res.json();
      if (!res.ok) {
        throw new Error(
          (data as unknown as { error?: string }).error ?? "failed",
        );
      }
      setAccess(data.access);
      setSessions(data.items);
    } catch {
      // Keep existing sessions on failure; user can still chat in active thread.
    }
  }, []);

  const openSession = useCallback(
    async (sessionId: string) => {
      setLoadingConversation(true);
      setError(null);
      try {
        const res = await fetch(`/api/ai/sessions/${sessionId}`, {
          method: "GET",
          headers: { Accept: "application/json" },
        });
        const data: ConversationResponse = await res.json();
        if (!res.ok) {
          throw new Error(
            (data as unknown as { error?: string }).error ?? "failed",
          );
        }
        setAccess(data.access);
        setActiveSession(data.session);
        setActiveSessionId(data.session?.id ?? sessionId);
        setMessages(data.messages);
        updateUrl(data.session?.id ?? sessionId);
        setSidebarOpen(false);
      } catch (loadError) {
        const message =
          loadError instanceof Error
            ? loadError.message
            : "Không thể tải hội thoại";
        setError(message);
      } finally {
        setLoadingConversation(false);
      }
    },
    [updateUrl],
  );

  const createNewChat = useCallback(
    async (entryPoint: EntryPoint = "home") => {
      setError(null);
      const res = await fetch("/api/ai/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryPoint }),
      });
      const data: CreateSessionResponse = await res.json();
      if (!res.ok) {
        throw new Error(
          (data as unknown as { error?: string }).error ?? "failed",
        );
      }
      setAccess(data.access);
      setActiveSession(data.session);
      setActiveSessionId(data.session.id);
      setMessages([]);
      updateUrl(data.session.id);
      await reloadSessions();
      setSidebarOpen(false);
      return data.session.id;
    },
    [reloadSessions, updateUrl],
  );

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, []);

  useEffect(() => {
    if (messages.length === 0) return;
    scrollToBottom();
  }, [messages.length, scrollToBottom]);

  useEffect(() => {
    if (profileOpen === false) return;
    const handleOutsideClick = (event: globalThis.MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (profileRef.current?.contains(target)) return;
      setProfileOpen(false);
    };
    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setProfileOpen(false);
    };
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [profileOpen]);

  useEffect(() => {
    if (activeSessionId) return;
    if (initialSessionId) return;
    if (!sessions.length) return;
    openSession(sessions[0].id);
  }, [activeSessionId, initialSessionId, openSession, sessions]);

  useEffect(() => {
    if (activeSessionId) return;
    if (!initialSessionId) return;
    openSession(initialSessionId);
  }, [activeSessionId, initialSessionId, openSession]);

  const handleLogout = useCallback(async () => {
    setProfileOpen(false);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Ignore and proceed.
    }
    router.replace("/auth/login");
    router.refresh();
  }, [router]);

  const handleBack = () => {
    if (from) {
      router.push(from);
      return;
    }
    router.back();
  };

  const currentTitle = useMemo(() => {
    if (activeSession) {
      return sessionTitle(activeSession.entryPoint, activeSession.quizTitle);
    }
    return "Trợ lý AI";
  }, [activeSession]);

  const canSend = access.allowed && !sending && input.trim().length > 0;
  const composerDisabled = !access.allowed || sending;

  const handleSend = useCallback(async () => {
    if (!canSend) return;

    const messageText = input.trim();
    setInput("");
    setError(null);

    const optimisticUser: ChatMessage = {
      id: `local-user-${nowIso()}`,
      role: "user",
      content: messageText,
      createdAt: nowIso(),
    };
    setMessages((prev) => [...prev, optimisticUser]);
    setSending(true);

    try {
      const ensuredSessionId =
        activeSessionId ??
        (await createNewChat(activeSession?.entryPoint ?? "home"));

      const sessionForSend = activeSession ?? {
        id: ensuredSessionId,
        entryPoint: "home",
        createdAt: nowIso(),
        quizTitle: null,
        attemptId: null,
        questionId: null,
      };

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entryPoint: sessionForSend.entryPoint,
          attemptId: sessionForSend.attemptId,
          questionId: sessionForSend.questionId,
          sessionId: ensuredSessionId,
          message: messageText,
        }),
      });

      const data: SendMessageResponse = await res.json();
      if (!res.ok) {
        throw new Error(
          (data as unknown as { error?: string }).error ?? "failed",
        );
      }

      setAccess(data.access);
      setActiveSessionId(data.sessionId);
      setMessages((prev) => [
        ...prev,
        {
          id: `local-assistant-${nowIso()}`,
          role: "assistant",
          content: data.reply,
          createdAt: nowIso(),
        },
      ]);

      updateUrl(data.sessionId);
      await reloadSessions();
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
      scrollToBottom();
    }
  }, [
    activeSession,
    activeSessionId,
    canSend,
    createNewChat,
    input,
    reloadSessions,
    scrollToBottom,
    updateUrl,
  ]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    handleSend();
  };

  const lockMessage = accessMessage(access);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <button
            type="button"
            className={styles.iconButton}
            onClick={handleBack}
            aria-label={backLabel}
          >
            <ArrowLeft size={18} weight="bold" />
          </button>
          <button
            type="button"
            className={`${styles.iconButton} ${styles.mobileToggle}`}
            onClick={() => setSidebarOpen((value) => !value)}
            aria-label="Mở danh sách hội thoại"
          >
            <ListIcon size={18} weight="bold" />
          </button>
          <div className={styles.headerTitle}>
            <div className={styles.title}>Trợ lý AI</div>
            <div className={styles.subtitle}>
              Hội thoại + lịch sử (theo tài khoản)
            </div>
          </div>
        </div>

        <div className={styles.headerRight}>
          <details
            className={styles.profile}
            ref={profileRef}
            open={profileOpen}
            onToggle={(event) => {
              setProfileOpen((event.currentTarget as HTMLDetailsElement).open);
            }}
          >
            <summary
              className={styles.profileSummary}
              aria-label="Mở menu hồ sơ"
            >
              <div
                className={`${styles.avatar} ${viewer.avatarUrl ? styles.avatarHasImage : ""}`}
                aria-hidden="true"
              >
                {viewer.avatarUrl ? (
                  <Image
                    src={viewer.avatarUrl}
                    alt="Ảnh đại diện"
                    fill
                    sizes="32px"
                    quality={80}
                    style={{ objectFit: "cover" }}
                  />
                ) : null}
              </div>
              <div className={styles.profileMeta}>
                <div className={styles.profileName}>{name}</div>
                <div className={styles.profileEmail}>{viewer.email}</div>
              </div>
            </summary>

            <div
              className={styles.profileMenu}
              role="menu"
              aria-label="Tùy chọn"
            >
              <Link
                href="/profile"
                role="menuitem"
                className={styles.profileLink}
                onClick={() => setProfileOpen(false)}
              >
                <UserCircle size={18} weight="bold" aria-hidden="true" />
                Hồ sơ
              </Link>
              <div className={styles.profileSeparator} aria-hidden="true" />
              <button
                type="button"
                role="menuitem"
                className={`${styles.profileLink} ${styles.profileLinkDanger}`}
                onClick={handleLogout}
              >
                <SignOut size={18} weight="bold" aria-hidden="true" />
                Đăng xuất
              </button>
            </div>
          </details>
        </div>
      </header>

      <div className={styles.main}>
        <aside
          className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ""}`}
          aria-label="Lịch sử hội thoại"
        >
          <div className={styles.sidebarHeader}>
            <button
              type="button"
              className={styles.newChat}
              onClick={async () => {
                try {
                  await createNewChat("home");
                } catch (createError) {
                  const message =
                    createError instanceof Error
                      ? createError.message
                      : "Không thể tạo hội thoại";
                  setError(message);
                }
              }}
              disabled={!access.allowed}
            >
              <Plus size={18} weight="bold" aria-hidden="true" />
              Chat mới
            </button>
          </div>

          <div className={styles.sessionList}>
            {!access.allowed ? (
              <div className={styles.sessionItem}>
                <div className={styles.sessionTitle}>{lockMessage}</div>
                <div className={styles.sessionPreview}>
                  Bạn vẫn có thể xem trang này, nhưng không thể chat khi bị
                  khoá.
                </div>
              </div>
            ) : null}

            {access.allowed && sessions.length === 0 ? (
              <div className={styles.sessionItem}>
                <div className={styles.sessionTitle}>Chưa có hội thoại</div>
                <div className={styles.sessionPreview}>
                  Nhấn “Chat mới” để bắt đầu.
                </div>
              </div>
            ) : null}

            {sessions.map((item) => {
              const isActive = item.id === activeSessionId;
              const label = sessionTitle(item.entryPoint, item.quizTitle);
              const timeLabel = formatRelativeTimeVi(
                item.lastMessageAt ?? item.createdAt,
              );
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`${styles.sessionItem} ${
                    isActive ? styles.sessionItemActive : ""
                  }`}
                  onClick={() => openSession(item.id)}
                >
                  <div className={styles.sessionTop}>
                    <div className={styles.sessionTitle}>{label}</div>
                    <div className={styles.sessionTime}>{timeLabel}</div>
                  </div>
                  <div className={styles.sessionPreview}>
                    {item.lastMessagePreview ??
                      (item.entryPoint === "home"
                        ? "Nhấn để mở hội thoại."
                        : "Nhấn để xem chi tiết.")}
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <section className={styles.chatPanel} aria-label="Hội thoại">
          <div className={styles.chatHeader}>
            <div className={styles.chatHeaderMeta}>
              <div className={styles.chatHeaderTitle}>{currentTitle}</div>
              <div className={styles.chatHeaderHint}>
                {activeSession
                  ? activeSession.entryPoint === "result"
                    ? "Ngữ cảnh: kết quả bài làm"
                    : activeSession.entryPoint === "question"
                      ? "Ngữ cảnh: câu hỏi"
                      : "Ngữ cảnh: học tập tổng quát"
                  : "Chọn 1 hội thoại ở bên trái hoặc tạo hội thoại mới."}
              </div>
            </div>

            <button
              type="button"
              className={`${styles.iconButton} ${styles.mobileToggle}`}
              onClick={() => setSidebarOpen((value) => !value)}
              aria-label="Mở danh sách hội thoại"
            >
              <ListIcon size={18} weight="bold" />
            </button>
          </div>

          <div className={styles.chatBody}>
            {loadingConversation ? (
              <div
                className={`${chatStyles.messageRow} ${chatStyles.messageAssistant}`}
              >
                <div
                  className={`${chatStyles.messageBubble} ${chatStyles.bubbleSystem}`}
                >
                  Đang tải…
                </div>
              </div>
            ) : null}

            {error ? (
              <div
                className={`${chatStyles.messageRow} ${chatStyles.messageAssistant}`}
              >
                <div
                  className={`${chatStyles.messageBubble} ${chatStyles.bubbleSystem}`}
                >
                  {error}
                </div>
              </div>
            ) : null}

            {!loadingConversation && !messages.length ? (
              <div className={styles.emptyCard}>
                <div className={styles.emptyTitle}>Bắt đầu nhanh</div>
                <div className={styles.emptyText}>
                  Gợi ý: “Phân tích điểm yếu của mình và lập kế hoạch học 7
                  ngày”, hoặc “Giải thích vì sao mình sai câu 3”.
                </div>
              </div>
            ) : null}

            {messages.map((message) => {
              const rowClass =
                message.role === "user"
                  ? chatStyles.messageUser
                  : chatStyles.messageAssistant;
              const bubbleClass =
                message.role === "user"
                  ? chatStyles.bubbleUser
                  : message.role === "assistant"
                    ? chatStyles.bubbleAssistant
                    : chatStyles.bubbleSystem;
              const content =
                message.role === "assistant" ? (
                  <RichText content={message.content} allowLinks={false} />
                ) : (
                  message.content
                );
              return (
                <div
                  key={message.id}
                  className={`${chatStyles.messageRow} ${rowClass}`}
                >
                  <div className={`${chatStyles.messageBubble} ${bubbleClass}`}>
                    {content}
                  </div>
                </div>
              );
            })}

            {sending ? (
              <div
                className={`${chatStyles.messageRow} ${chatStyles.messageAssistant}`}
              >
                <div
                  className={`${chatStyles.messageBubble} ${chatStyles.bubbleAssistant}`}
                >
                  Đang trả lời…
                </div>
              </div>
            ) : null}

            <div ref={bottomRef} />
          </div>

          <form className={chatStyles.composer} onSubmit={handleSubmit}>
            <textarea
              className={chatStyles.textarea}
              placeholder={
                access.allowed ? "Nhập câu hỏi…" : "AI hiện không khả dụng…"
              }
              value={input}
              onChange={(event) => setInput(event.target.value)}
              disabled={composerDisabled}
              onKeyDown={(event) => {
                if (event.key !== "Enter") return;
                if (event.shiftKey) return;
                event.preventDefault();
                handleSend();
              }}
            />
            <button
              type="submit"
              className={chatStyles.sendButton}
              disabled={!canSend}
              aria-label="Gửi"
            >
              Gửi
            </button>
          </form>

          <div className={chatStyles.hint}>
            Nội dung do AI tạo, có thể sai. Hãy kiểm chứng với tài liệu/chuyên
            gia.
          </div>
        </section>
      </div>
    </div>
  );
}
