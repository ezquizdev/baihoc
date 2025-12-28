import { env } from "@/core/env";

type GeminiRole = "user" | "model";

export type LlmMessage = {
  role: "user" | "assistant";
  content: string;
};

export type LlmGenerateInput = {
  systemInstruction: string;
  messages: LlmMessage[];
  timeoutMs?: number;
};

export type LlmGenerateResult = {
  text: string;
  tokenUsage: unknown | null;
};

export class LlmError extends Error {
  readonly code:
    | "LLM_UNCONFIGURED"
    | "LLM_TIMEOUT"
    | "LLM_BAD_RESPONSE"
    | "LLM_HTTP_ERROR";

  constructor(
    code: LlmError["code"],
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.code = code;
  }
}

const defaultModel = "gemini-2.5-flash";

function toGeminiRole(role: LlmMessage["role"]): GeminiRole {
  return role === "assistant" ? "model" : "user";
}

type GeminiGenerateResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  usageMetadata?: unknown;
  error?: { message?: string };
};

export async function generateLlmText(
  input: LlmGenerateInput,
): Promise<LlmGenerateResult> {
  const apiKey = env.LLM_API_KEY;
  if (!apiKey) {
    throw new LlmError("LLM_UNCONFIGURED", "LLM is not configured");
  }

  const controller = new AbortController();
  const timeoutMs = input.timeoutMs ?? 20_000;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${defaultModel}:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: input.systemInstruction }] },
        contents: input.messages.map((message) => ({
          role: toGeminiRole(message.role),
          parts: [{ text: message.content }],
        })),
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 900,
        },
      }),
    });

    const data: GeminiGenerateResponse = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new LlmError(
        "LLM_HTTP_ERROR",
        data.error?.message ?? `LLM request failed (${res.status})`,
      );
    }

    const text =
      data.candidates?.[0]?.content?.parts
        ?.map((part) => part.text ?? "")
        .join("") ?? "";
    const normalized = text.trim();
    if (!normalized) {
      throw new LlmError(
        "LLM_BAD_RESPONSE",
        "LLM returned empty content",
        data,
      );
    }

    return { text: normalized, tokenUsage: data.usageMetadata ?? null };
  } catch (error) {
    if (error instanceof LlmError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new LlmError("LLM_TIMEOUT", "LLM request timed out", error);
    }
    throw new LlmError("LLM_HTTP_ERROR", "LLM request failed", error);
  } finally {
    clearTimeout(timeout);
  }
}
