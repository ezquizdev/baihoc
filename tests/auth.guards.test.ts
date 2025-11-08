import { NextResponse } from "next/server";
import { describe, expect, it, vi } from "vitest";
import {
  requireAuthenticatedApi,
  requireAuthenticatedPage,
} from "@/application/infra/auth/guards";
import * as sessionModule from "@/application/infra/auth/session";

describe("auth guards", () => {
  const session: sessionModule.SessionPayload = {
    sub: "u1",
    email: "user@example.com",
    role: "student",
    profileCompleted: true,
  };

  it("requireAuthenticatedPage redirects to login when missing session", async () => {
    vi.spyOn(sessionModule, "getSession").mockResolvedValueOnce(null);
    await expect(() =>
      requireAuthenticatedPage({ next: "/protected" }),
    ).rejects.toThrow(/NEXT_REDIRECT/);
  });

  it("requireAuthenticatedPage redirects incomplete profile", async () => {
    vi.spyOn(sessionModule, "getSession").mockResolvedValueOnce({
      ...session,
      profileCompleted: false,
    });
    await expect(() => requireAuthenticatedPage()).rejects.toThrow(
      /NEXT_REDIRECT/,
    );
  });

  it("requireAuthenticatedPage redirects on wrong role", async () => {
    vi.spyOn(sessionModule, "getSession").mockResolvedValueOnce({
      ...session,
      role: "student",
    });
    await expect(() =>
      requireAuthenticatedPage({ role: "staff" }),
    ).rejects.toThrow(/NEXT_REDIRECT/);
  });

  it("requireAuthenticatedPage returns session on success", async () => {
    vi.spyOn(sessionModule, "getSession").mockResolvedValueOnce(session);
    const res = await requireAuthenticatedPage();
    expect(res.email).toBe("user@example.com");
  });

  it("requireAuthenticatedApi returns 401 when no session", async () => {
    vi.spyOn(sessionModule, "getSession").mockResolvedValueOnce(null);
    const res = await requireAuthenticatedApi({} as unknown as Request);
    expect(res).toBeInstanceOf(NextResponse);
    expect((res as NextResponse).status).toBe(401);
  });

  it("requireAuthenticatedApi returns 403 on incomplete profile", async () => {
    vi.spyOn(sessionModule, "getSession").mockResolvedValueOnce({
      ...session,
      profileCompleted: false,
    });
    const res = await requireAuthenticatedApi({} as unknown as Request);
    expect((res as NextResponse).status).toBe(403);
  });

  it("requireAuthenticatedApi returns 403 on wrong role", async () => {
    vi.spyOn(sessionModule, "getSession").mockResolvedValueOnce({
      ...session,
      role: "student",
    });
    const res = await requireAuthenticatedApi({} as unknown as Request, {
      role: "staff",
    });
    expect((res as NextResponse).status).toBe(403);
  });

  it("requireAuthenticatedApi passes through session on success", async () => {
    vi.spyOn(sessionModule, "getSession").mockResolvedValueOnce(session);
    const res = await requireAuthenticatedApi({} as unknown as Request);
    expect(res).toEqual(session);
  });
});
