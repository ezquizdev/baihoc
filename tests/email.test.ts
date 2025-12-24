import { describe, expect, it, vi } from "vitest";

vi.mock("@/application/infra/email/brevo", () => ({
  sendEmailViaBrevo: vi.fn(async () => ({
    messageId: "mocked-message-id",
  })),
}));

import { sendEmailViaBrevo } from "@/application/infra/email/brevo";
import { sendTransactionalEmail } from "@/application/services/emailService";

describe("emailService", () => {
  it("formats transactional email request", async () => {
    const payload = {
      to: [{ email: "someone@example.com", name: "Someone" }],
      subject: "Test",
      text: "Hello",
      tags: ["welcome"],
    };
    const result = await sendTransactionalEmail(payload);
    expect(result.messageId).toBe("mocked-message-id");
    expect(sendEmailViaBrevo).toHaveBeenCalledWith({
      to: payload.to,
      subject: payload.subject,
      htmlContent: undefined,
      textContent: payload.text,
      tags: payload.tags,
    });
  });
});
