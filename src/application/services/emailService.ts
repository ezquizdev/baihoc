import {
  type EmailRecipient,
  type SendEmailResult,
  sendEmailViaBrevo,
} from "@/application/infra/email/brevo";

export type SendEmailParams = {
  to: EmailRecipient[];
  subject: string;
  html?: string;
  text?: string;
  tags?: string[];
};

export async function sendTransactionalEmail(
  params: SendEmailParams,
): Promise<SendEmailResult> {
  if (!params.html && !params.text) {
    throw new Error("Email payload must include html or text content");
  }

  return sendEmailViaBrevo({
    to: params.to,
    subject: params.subject,
    htmlContent: params.html,
    textContent: params.text,
    tags: params.tags,
  });
}
