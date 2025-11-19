import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { describe, expect, it, vi } from "vitest";
import {
  requireAuthenticatedApi,
  requireAuthenticatedPage,
} from "@/application/infra/auth/guards";
import * as sessionModule from "@/application/infra/auth/session";
import * as userRepo from "@/application/infra/db/userRepo";

describe("auth guards", () => {
  const session: sessionModule.SessionPayload = {
    sub: "u1",
    email: "user@example.com",
    role: "student",
    profileCompleted: true,
  };
  const fakeRequest = {} as unknown as NextRequest;

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
    vi.spyOn(userRepo, "findUserById").mockResolvedValueOnce({
      id: "u1",
      email: "user@example.com",
      full_name: "User",
      password_hash: null,
      role: "student",
      tier: "free",
      status: "active",
      email_verified_at: new Date().toISOString(),
      oauth_provider: null,
      oauth_sub: null,
      profile_completed: false,
      avatar_url: null,
      school: null,
      date_of_birth: null,
      last_login_at: null,
      created_at: "",
      updated_at: "",
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
    vi.spyOn(userRepo, "findUserById").mockResolvedValueOnce({
      id: "u1",
      email: "user@example.com",
      full_name: "User",
      password_hash: null,
      role: "student",
      tier: "free",
      status: "active",
      email_verified_at: new Date().toISOString(),
      oauth_provider: null,
      oauth_sub: null,
      profile_completed: true,
      avatar_url: null,
      school: null,
      date_of_birth: null,
      last_login_at: null,
      created_at: "",
      updated_at: "",
    });
    await expect(() =>
      requireAuthenticatedPage({ role: "staff" }),
    ).rejects.toThrow(/NEXT_REDIRECT/);
  });

  it("requireAuthenticatedPage returns session on success", async () => {
    vi.spyOn(sessionModule, "getSession").mockResolvedValueOnce(session);
    vi.spyOn(userRepo, "findUserById").mockResolvedValueOnce({
      id: "u1",
      email: "user@example.com",
      full_name: "User",
      password_hash: null,
      role: "student",
      tier: "free",
      status: "active",
      email_verified_at: new Date().toISOString(),
      oauth_provider: null,
      oauth_sub: null,
      profile_completed: true,
      avatar_url: null,
      school: null,
      date_of_birth: null,
      last_login_at: null,
      created_at: "",
      updated_at: "",
    });
    const res = await requireAuthenticatedPage();
    expect(res.email).toBe("user@example.com");
  });

  it("requireAuthenticatedApi returns 401 when no session", async () => {
    vi.spyOn(sessionModule, "getSession").mockResolvedValueOnce(null);
    const res = await requireAuthenticatedApi(fakeRequest);
    expect(res).toBeInstanceOf(NextResponse);
    expect((res as NextResponse).status).toBe(401);
  });

  it("requireAuthenticatedApi returns 403 on incomplete profile", async () => {
    vi.spyOn(sessionModule, "getSession").mockResolvedValueOnce({
      ...session,
      profileCompleted: false,
    });
    vi.spyOn(userRepo, "findUserById").mockResolvedValueOnce({
      id: "u1",
      email: "user@example.com",
      full_name: "User",
      password_hash: null,
      role: "student",
      tier: "free",
      status: "active",
      email_verified_at: new Date().toISOString(),
      oauth_provider: null,
      oauth_sub: null,
      profile_completed: false,
      avatar_url: null,
      school: null,
      date_of_birth: null,
      last_login_at: null,
      created_at: "",
      updated_at: "",
    });
    const res = await requireAuthenticatedApi(fakeRequest);
    expect((res as NextResponse).status).toBe(403);
  });

  it("requireAuthenticatedApi returns 403 on wrong role", async () => {
    vi.spyOn(sessionModule, "getSession").mockResolvedValueOnce({
      ...session,
      role: "student",
    });
    vi.spyOn(userRepo, "findUserById").mockResolvedValueOnce({
      id: "u1",
      email: "user@example.com",
      full_name: "User",
      password_hash: null,
      role: "student",
      tier: "free",
      status: "active",
      email_verified_at: new Date().toISOString(),
      oauth_provider: null,
      oauth_sub: null,
      profile_completed: true,
      avatar_url: null,
      school: null,
      date_of_birth: null,
      last_login_at: null,
      created_at: "",
      updated_at: "",
    });
    const res = await requireAuthenticatedApi(fakeRequest, { role: "staff" });
    expect((res as NextResponse).status).toBe(403);
  });

  it("requireAuthenticatedApi passes through session on success", async () => {
    vi.spyOn(sessionModule, "getSession").mockResolvedValueOnce(session);
    vi.spyOn(userRepo, "findUserById").mockResolvedValueOnce({
      id: "u1",
      email: "user@example.com",
      full_name: "User",
      password_hash: null,
      role: "student",
      tier: "free",
      status: "active",
      email_verified_at: new Date().toISOString(),
      oauth_provider: null,
      oauth_sub: null,
      profile_completed: true,
      avatar_url: null,
      school: null,
      date_of_birth: null,
      last_login_at: null,
      created_at: "",
      updated_at: "",
    });
    const res = await requireAuthenticatedApi(fakeRequest);
    expect(res).toMatchObject(session);
  });
});
