import { env } from "@/core/env";

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

export type EmailRecipient = {
  email: string;
  name?: string;
};

export type SendEmailInput = {
  to: EmailRecipient[];
  subject: string;
  htmlContent?: string;
  textContent?: string;
  tags?: string[];
  headers?: Record<string, string>;
  replyTo?: EmailRecipient;
};

export type SendEmailResult = {
  messageId: string;
  messageIds?: string[];
};

export async function sendEmailViaBrevo(
  input: SendEmailInput,
): Promise<SendEmailResult> {
  const response = await fetch(BREVO_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": env.BREVO_API_KEY,
    },
    body: JSON.stringify({
      sender: {
        email: env.BREVO_SENDER_EMAIL,
        name: env.BREVO_SENDER_NAME,
      },
      to: input.to,
      subject: input.subject,
      htmlContent: input.htmlContent,
      textContent: input.textContent,
      replyTo: input.replyTo,
      headers: input.headers,
      tags: input.tags,
    }),
  });

  if (!response.ok) {
    const errorPayload = await response.text();
    throw new Error(
      `Brevo email failed: ${response.status} ${response.statusText} - ${errorPayload}`,
    );
  }

  const data = (await response.json()) as SendEmailResult;
  return data;
}
