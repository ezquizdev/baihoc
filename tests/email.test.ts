import { describe, expect, it, vi } from "vitest";

vi.mock("@/application/services/emailService", () => ({
  sendTransactionalEmail: vi.fn(async (payload) => ({
    messageId: "mocked-message-id",
    payload,
  })),
}));

import { sendTransactionalEmail } from "@/application/services/emailService";

describe("emailService", () => {
  it("formats transactional email request", async () => {
    const payload = {
      to: [{ email: "someone@example.com", name: "Someone" }],
      subject: "Test",
      text: "Hello",
    };
    const result = await sendTransactionalEmail(payload);
    expect(result.messageId).toBe("mocked-message-id");
    expect(result.payload).toEqual(payload);
  });
});
