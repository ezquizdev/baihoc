import { describe, expect, it } from "vitest";
import { sendTransactionalEmail } from "@/application/services/emailService";

describe("emailService", () => {
  it("sends a test email to huytrinhm@gmail.com", async () => {
    const timestamp = new Date().toISOString();
    const result = await sendTransactionalEmail({
      to: [{ email: "huytrinhm@gmail.com", name: "Huy Trinh" }],
      subject: `BaiHoc test email ${timestamp}`,
      text: `Hi Huy,\n\nThis is an automated test email sent at ${timestamp}.\n\nCheers,\nBaiHoc`,
    });

    expect(result.messageId).toBeDefined();
  }, 20_000);
});
