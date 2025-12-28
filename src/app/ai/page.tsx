import {
  controllerGetAiChatConversation,
  controllerListAiChatSessions,
} from "@/application/controllers/aiChatController";
import { requireAuthenticatedPage } from "@/application/infra/auth/guards";
import { AiChatPage } from "@/components/ai-chat/AiChatPage";
import { sanitizeNextPath } from "@/lib/urls";

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Props = {
  searchParams: Promise<{
    sessionId?: string;
    from?: string;
  }>;
};

export default async function AiPage({ searchParams }: Props) {
  const params = await searchParams;
  const sessionId =
    typeof params.sessionId === "string" && uuidRegex.test(params.sessionId)
      ? params.sessionId
      : null;
  const from = sanitizeNextPath(params.from) ?? null;

  const next = sessionId ? `/ai?sessionId=${sessionId}` : "/ai";
  const session = await requireAuthenticatedPage({ next });

  const [initialSessions, initialConversation] = await Promise.all([
    controllerListAiChatSessions({ userId: session.sub, limit: 60, offset: 0 }),
    sessionId
      ? controllerGetAiChatConversation({
          userId: session.sub,
          sessionId,
        }).catch(() => null)
      : Promise.resolve(null),
  ]);

  return (
    <AiChatPage
      viewer={{
        email: session.email,
        fullName: session.fullName ?? null,
        avatarUrl: session.avatarUrl ?? null,
        role: session.role,
      }}
      initialFrom={from}
      initialSessions={initialSessions}
      initialConversation={initialConversation}
      initialSessionId={sessionId}
    />
  );
}
