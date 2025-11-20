import bcrypt from "bcryptjs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const adminEmail = "admin@example.com";
const adminPassword = "Secret123!";

const baseEnv = {
  DATABASE_URL: "postgres://localhost:5432/db",
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_ANON_KEY: "anon",
  SUPABASE_SERVICE_ROLE_KEY: "service",
  SESSION_SECRET: "x".repeat(32),
  BREVO_API_KEY: "brevo",
  BREVO_SENDER_EMAIL: "noreply@example.com",
  BREVO_SENDER_NAME: "BaiHoc",
  GOOGLE_CLIENT_ID: "google",
  GOOGLE_CLIENT_SECRET: "google-secret",
  LLM_API_KEY: "llm",
  ADMIN_SEED_EMAIL: adminEmail,
  ADMIN_SEED_PASSWORD: adminPassword,
  ADMIN_SEED_NAME: "Seed Admin",
  NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  NEXT_PUBLIC_LOG_LEVEL: "info",
  NEXT_PUBLIC_GOOGLE_CLIENT_ID: "google-public",
};

vi.mock("@/application/infra/db/allowlistRepo", () => {
  return {
    insertAllowlistEmail: vi.fn(async () => {}),
  };
});

type MockAuditLog = { action: string };
const auditLogs: MockAuditLog[] = [];
vi.mock("@/application/infra/db/auditRepo", () => ({
  insertAuditLog: vi.fn(async (input) => {
    auditLogs.push(input);
  }),
}));

const membershipRecords: string[] = [];
vi.mock("@/application/infra/db/membershipRepo", () => ({
  insertAllowlistUpgrade: vi.fn(async (userId: string) => {
    membershipRecords.push(userId);
  }),
}));

type MockUser = {
  id: string;
  email: string;
  password_hash: string | null;
  role: "student" | "staff";
  tier: "free" | "paid";
  status: string;
  profile_completed: boolean;
  email_verified_at: string | null;
};

const userStore: Record<string, MockUser> = {};
vi.mock("@/application/infra/db/userRepo", () => ({
  createUser: vi.fn(async (input: Partial<MockUser> & { email: string }) => {
    const user = {
      id: "seed-id",
      ...input,
      password_hash: input.password_hash,
    };
    userStore[user.email] = user;
    return user;
  }),
  findUserByEmail: vi.fn(async (email: string) => userStore[email] ?? null),
  adminUpdateUser: vi.fn(async (id: string, updates: Partial<MockUser>) => {
    const user = Object.values(userStore).find((u) => u.id === id);
    if (!user) return null;
    Object.assign(user, updates);
    return user;
  }),
  updatePassword: vi.fn(async (id: string, hash: string) => {
    const user = Object.values(userStore).find((u) => u.id === id);
    if (user) user.password_hash = hash;
  }),
  updateUserProfile: vi.fn(async (id: string, updates: Partial<MockUser>) => {
    const user = Object.values(userStore).find((u) => u.id === id);
    if (user) Object.assign(user, updates);
  }),
  markEmailVerified: vi.fn(async (id: string) => {
    const user = Object.values(userStore).find((u) => u.id === id);
    if (user) {
      user.status = "active";
      user.email_verified_at = new Date().toISOString();
    }
  }),
}));

vi.mock("@/core/env", () => ({
  env: baseEnv,
}));

describe("seedAdmin bootstrap", () => {
  beforeEach(() => {
    vi.resetModules();
    Object.keys(userStore).forEach((k) => {
      delete userStore[k];
    });
    auditLogs.length = 0;
    membershipRecords.length = 0;
  });

  it("creates admin user when missing", async () => {
    const { ensureSeedAdmin } = await import(
      "@/application/bootstrap/seedAdmin"
    );
    await ensureSeedAdmin();

    const user = userStore[adminEmail];
    expect(user).toBeDefined();
    expect(user.role).toBe("staff");
    expect(user.tier).toBe("paid");
    expect(user.status).toBe("active");
    expect(user.email_verified_at).toBeTruthy();
    expect(auditLogs.some((l) => l.action === "seed_admin_created")).toBe(true);
    expect(membershipRecords).toHaveLength(1);
  });

  it("hardens existing user and updates password when needed", async () => {
    const existingHash = await bcrypt.hash("oldpass", 10);
    userStore[adminEmail] = {
      id: "existing-id",
      email: adminEmail,
      password_hash: existingHash,
      role: "student",
      tier: "free",
      status: "pending_verification",
      profile_completed: false,
      email_verified_at: null,
    };

    const { ensureSeedAdmin } = await import(
      "@/application/bootstrap/seedAdmin"
    );
    await ensureSeedAdmin();

    const user = userStore[adminEmail];
    expect(user.role).toBe("staff");
    expect(user.tier).toBe("paid");
    expect(user.status).toBe("active");
    expect(user.profile_completed).toBe(true);
    expect(await bcrypt.compare(adminPassword, user.password_hash)).toBe(true);
    expect(auditLogs.some((l) => l.action === "seed_admin_hardened")).toBe(
      true,
    );
  });
});
