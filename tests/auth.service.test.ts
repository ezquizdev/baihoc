import bcrypt from "bcryptjs";
import type { Mock } from "vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  ResetTokenRow,
  VerificationTokenRow,
} from "@/application/infra/db/tokenRepo";
import type { CreateUserInput, UserRow } from "@/application/infra/db/userRepo";

type MockUserRow = UserRow;

type AllowlistEntry = {
  email: string;
  role: "student" | "staff";
  tier: "free" | "paid";
};

vi.mock("@/application/infra/db/userRepo", () => {
  const store: Record<string, MockUserRow> = {};
  return {
    __store: store,
    createUser: vi.fn(async (input: CreateUserInput) => {
      const user: MockUserRow = {
        id: input.email ?? "user-id",
        email: input.email,
        full_name: input.full_name,
        password_hash: input.password_hash ?? null,
        school: input.school ?? null,
        date_of_birth: input.date_of_birth ?? null,
        avatar_url: input.avatar_url ?? null,
        role: input.role ?? "student",
        tier: input.tier ?? "free",
        status: input.status ?? "pending_verification",
        email_verified_at: input.email_verified_at ?? null,
        oauth_provider: input.oauth_provider ?? null,
        oauth_sub: input.oauth_sub ?? null,
        profile_completed: input.profile_completed ?? false,
        last_login_at: null,
        created_at: "",
        updated_at: "",
      };
      store[user.email] = user;
      return user;
    }),
    findUserByEmail: vi.fn(async (email: string) => store[email] ?? null),
    findUserById: vi.fn(
      async (id: string) =>
        Object.values(store).find((u) => u.id === id) ?? null,
    ),
    linkUserOAuth: vi.fn(async (id: string, provider: string, sub: string) => {
      const user = Object.values(store).find((u) => u.id === id);
      if (user) {
        user.oauth_provider = provider as MockUserRow["oauth_provider"];
        user.oauth_sub = sub;
      }
      return user ?? null;
    }),
    markEmailVerified: vi.fn(async (userId: string) => {
      const user = Object.values(store).find((u) => u.id === userId);
      if (user) {
        user.status = "active";
        user.email_verified_at = new Date().toISOString();
      }
    }),
    updatePassword: vi.fn(async (userId: string, hash: string) => {
      const user = Object.values(store).find((u) => u.id === userId);
      if (user) user.password_hash = hash;
    }),
    updateLastLogin: vi.fn(async () => {}),
    updateUserProfile: vi.fn(
      async (userId: string, input: Partial<MockUserRow>) => {
        const user = Object.values(store).find((u) => u.id === userId);
        if (!user) return null;
        Object.assign(user, {
          full_name: input.full_name ?? user.full_name,
          school: input.school ?? user.school,
          date_of_birth: input.date_of_birth ?? user.date_of_birth,
          avatar_url: input.avatar_url ?? user.avatar_url,
          profile_completed:
            input.profile_completed ?? user.profile_completed ?? false,
          updated_at: new Date().toISOString(),
        });
        return user;
      },
    ),
  };
});

vi.mock("@/application/infra/db/tokenRepo", () => {
  const verifyMap = new Map<string, string>();
  const resetMap = new Map<string, string>();
  return {
    createEmailVerificationToken: vi.fn(async (userId: string) => {
      verifyMap.set("verify-token", userId);
      return "verify-token";
    }),
    consumeEmailVerificationToken: vi.fn(async (token: string) => {
      const userId = token === "good-verify" ? "user-id" : verifyMap.get(token);
      return userId
        ? ({
            id: "verify-token-id",
            user_id: userId,
            token_hash: "hash",
            expires_at: new Date().toISOString(),
            used_at: null,
            created_at: new Date().toISOString(),
          } as VerificationTokenRow)
        : null;
    }),
    createPasswordResetToken: vi.fn(async (userId: string) => {
      resetMap.set("reset-token", userId);
      return "reset-token";
    }),
    consumePasswordResetToken: vi.fn(async (token: string) => {
      const userId = token === "good-reset" ? "user-id" : resetMap.get(token);
      return userId
        ? ({
            id: "reset-token-id",
            user_id: userId,
            token_hash: "hash",
            expires_at: new Date().toISOString(),
            used_at: null,
            created_at: new Date().toISOString(),
          } as ResetTokenRow)
        : null;
    }),
    isPasswordResetTokenValid: vi.fn(async (token: string) => {
      const userId = token === "good-reset" ? "user-id" : resetMap.get(token);
      return userId
        ? ({
            id: "reset-token-id",
            user_id: userId,
            token_hash: "hash",
            expires_at: new Date().toISOString(),
            used_at: null,
            created_at: new Date().toISOString(),
          } as ResetTokenRow)
        : null;
    }),
  };
});

vi.mock("@/application/infra/db/allowlistRepo", () => {
  let entry: AllowlistEntry | null = null;
  return {
    __setAllowlistEntry(next: AllowlistEntry | null) {
      entry = next;
    },
    findAllowlistEntryByEmail: vi.fn(async (email: string) => {
      if (!entry) return null;
      if (entry.email !== email) return null;
      return {
        email: entry.email,
        role: entry.role,
        tier: entry.tier,
        added_by: null,
        created_at: "",
      };
    }),
  };
});

vi.mock("@/application/infra/db/membershipRepo", () => {
  const records: Array<{ userId: string }> = [];
  return {
    __records: records,
    insertAllowlistUpgrade: vi.fn(async (userId: string) => {
      records.push({ userId });
    }),
  };
});

vi.mock("@/application/services/emailService", () => ({
  sendTransactionalEmail: vi.fn(async () => ({ messageId: "mocked" })),
}));

vi.mock("@/application/infra/storage/supabase", () => ({
  supabaseServer: {
    storage: {
      from: () => ({
        upload: async () => ({ error: null }),
        getPublicUrl: () => ({
          data: { publicUrl: "http://example.com/avatar" },
        }),
      }),
    },
  },
}));

const userRepo = (await import(
  "@/application/infra/db/userRepo"
)) as unknown as typeof import("@/application/infra/db/userRepo") & {
  __store: Record<string, MockUserRow>;
};
const tokenRepo = await import("@/application/infra/db/tokenRepo");
const emailService = await import("@/application/services/emailService");
const allowlistRepo = await import("@/application/infra/db/allowlistRepo");
const membershipRepo = await import("@/application/infra/db/membershipRepo");

const {
  registerWithEmail,
  loginWithEmail,
  verifyEmailWithToken,
  googleLogin,
  resetPasswordWithToken,
  requestPasswordReset,
} = await import("@/application/services/authService");

describe("authService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const store = (
      userRepo as unknown as { __store: Record<string, MockUserRow> }
    ).__store;
    Object.keys(store).forEach((k) => {
      delete store[k];
    });
    (
      allowlistRepo as unknown as {
        __setAllowlistEntry: (entry: AllowlistEntry | null) => void;
      }
    ).__setAllowlistEntry(null);
    (membershipRepo as unknown as { __records: unknown[] }).__records.length =
      0;
  });

  it("registerWithEmail hashes password, enforces confirm, and sends verify email", async () => {
    const user = await registerWithEmail({
      email: "test@example.com",
      password: "Password123!",
      passwordConfirm: "Password123!",
      fullName: "Tester",
    });

    const created = (
      userRepo as unknown as { __store: Record<string, MockUserRow> }
    ).__store["test@example.com"];
    expect(created).toBeDefined();
    expect(created.password_hash).toBeTruthy();
    if (!created.password_hash) {
      throw new Error("Missing password hash");
    }
    expect(await bcrypt.compare("Password123!", created.password_hash)).toBe(
      true,
    );
    expect(tokenRepo.createEmailVerificationToken).toHaveBeenCalledWith(
      user.id,
      expect.any(Number),
    );
    expect(emailService.sendTransactionalEmail).toHaveBeenCalledTimes(1);
  });

  it("registerWithEmail uses allowlist role/tier and logs membership for paid", async () => {
    (
      allowlistRepo as unknown as {
        __setAllowlistEntry: (entry: AllowlistEntry | null) => void;
      }
    ).__setAllowlistEntry({
      email: "allow@example.com",
      role: "staff",
      tier: "paid",
    });

    const user = await registerWithEmail({
      email: "allow@example.com",
      password: "Password123!",
      passwordConfirm: "Password123!",
      fullName: "Allow Listed",
    });

    expect(user.role).toBe("staff");
    expect(user.tier).toBe("paid");
    expect(user.status).toBe("active");
    expect(user.email_verified_at).toBeTruthy();
    const membershipRecords = (
      membershipRepo as unknown as { __records: Array<{ userId: string }> }
    ).__records;
    expect(membershipRecords).toHaveLength(1);
    expect(membershipRecords[0].userId).toBe(user.id);
  });

  it("registerWithEmail rejects mismatched confirm", async () => {
    await expect(
      registerWithEmail({
        email: "foo@example.com",
        password: "Password123!",
        passwordConfirm: "nope",
        fullName: "Foo",
      }),
    ).rejects.toThrow(/khớp/);
  });

  it("loginWithEmail rejects unverified/deactivated", async () => {
    const baseUser: UserRow = {
      id: "base",
      email: "u@example.com",
      full_name: "U",
      password_hash: await bcrypt.hash("pass1234", 10),
      role: "student",
      tier: "free",
      status: "active",
      email_verified_at: null,
      oauth_provider: null,
      oauth_sub: null,
      profile_completed: true,
      avatar_url: null,
      school: null,
      date_of_birth: null,
      last_login_at: null,
      created_at: "",
      updated_at: "",
    };
    (userRepo.findUserByEmail as unknown as Mock).mockResolvedValueOnce({
      ...baseUser,
      id: "u1",
      status: "pending_verification",
    });
    await expect(
      loginWithEmail({ email: "u@example.com", password: "pass1234" }),
    ).rejects.toThrow(/chưa được xác minh/);

    (userRepo.findUserByEmail as unknown as Mock).mockResolvedValueOnce({
      ...baseUser,
      id: "u2",
      status: "deactivated",
    });
    await expect(
      loginWithEmail({ email: "u@example.com", password: "pass1234" }),
    ).rejects.toThrow(/vô hiệu hóa/);
  });

  it("googleLogin enforces status", async () => {
    (userRepo.findUserByEmail as unknown as Mock).mockResolvedValueOnce({
      id: "g1",
      email: "g@example.com",
      password_hash: null,
      full_name: "G",
      role: "student",
      tier: "free",
      status: "deactivated",
      email_verified_at: new Date().toISOString(),
      oauth_provider: "google",
      oauth_sub: "sub",
      profile_completed: true,
      avatar_url: null,
      school: null,
      date_of_birth: null,
      last_login_at: null,
      created_at: "",
      updated_at: "",
    });

    await expect(
      googleLogin({ sub: "sub", email: "g@example.com" }),
    ).rejects.toThrow(/vô hiệu hóa/);
  });

  it("rejects email registration when email exists", async () => {
    await registerWithEmail({
      email: "dup@example.com",
      password: "Password123!",
      passwordConfirm: "Password123!",
      fullName: "Dup",
    });
    await expect(
      registerWithEmail({
        email: "dup@example.com",
        password: "Password123!",
        passwordConfirm: "Password123!",
        fullName: "Dup 2",
      }),
    ).rejects.toThrow(/đã được đăng ký/);
  });

  it("rejects google registration when email exists", async () => {
    await registerWithEmail({
      email: "dup-google@example.com",
      password: "Password123!",
      passwordConfirm: "Password123!",
      fullName: "Existing",
    });
    await expect(
      (await import("@/application/services/authService")).googleRegister({
        sub: "sub-x",
        email: "dup-google@example.com",
      }),
    ).rejects.toThrow(/Email đã tồn tại/);
  });

  it("googleLogin fails for unknown account", async () => {
    (userRepo.findUserByEmail as unknown as Mock).mockResolvedValueOnce(null);
    await expect(
      googleLogin({ sub: "newsub", email: "none@example.com" }),
    ).rejects.toThrow(/chưa được đăng ký/);
  });

  it("googleLogin links OAuth to password account", async () => {
    (userRepo as unknown as { __store: Record<string, MockUserRow> }).__store[
      "link@example.com"
    ] = {
      id: "link1",
      email: "link@example.com",
      password_hash: await bcrypt.hash("Password123!", 10),
      full_name: "Link",
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
    };
    (userRepo.findUserByEmail as unknown as Mock).mockResolvedValueOnce({
      ...(userRepo as unknown as { __store: Record<string, MockUserRow> })
        .__store["link@example.com"],
    });
    (userRepo.linkUserOAuth as unknown as Mock).mockImplementation(
      async (_id, provider, sub) => {
        const user = (
          userRepo as unknown as { __store: Record<string, MockUserRow> }
        ).__store["link@example.com"];
        user.oauth_provider = provider;
        user.oauth_sub = sub;
        return user;
      },
    );
    const user = await googleLogin({
      sub: "link-sub",
      email: "link@example.com",
    });
    expect(user.oauth_sub).toBe("link-sub");
    expect(user.oauth_provider).toBe("google");
  });

  it("verifyEmailWithToken marks email verified", async () => {
    const user = await registerWithEmail({
      email: "v@example.com",
      password: "Password123!",
      passwordConfirm: "Password123!",
      fullName: "Verify",
    });
    await verifyEmailWithToken("verify-token");
    const stored = (
      userRepo as unknown as { __store: Record<string, MockUserRow> }
    ).__store[user.email];
    expect(stored.status).toBe("active");
    expect(stored.email_verified_at).toBeTruthy();
  });

  it("resetPasswordWithToken hashes new password", async () => {
    await registerWithEmail({
      email: "r@example.com",
      password: "OldPass123!",
      passwordConfirm: "OldPass123!",
      fullName: "Reset",
    });
    (
      tokenRepo.consumePasswordResetToken as unknown as Mock
    ).mockResolvedValueOnce({
      id: "reset-token-id",
      user_id: "r@example.com",
      token_hash: "hash",
      expires_at: new Date().toISOString(),
      used_at: null,
      created_at: new Date().toISOString(),
    });
    await resetPasswordWithToken("good-reset", "NewPass123!");
    const stored = (
      userRepo as unknown as { __store: Record<string, MockUserRow> }
    ).__store["r@example.com"];
    expect(await bcrypt.compare("NewPass123!", stored.password_hash)).toBe(
      true,
    );
  });

  it("allows password reset request for Google-only account", async () => {
    (userRepo as unknown as { __store: Record<string, MockUserRow> }).__store[
      "google@example.com"
    ] = {
      id: "google@example.com",
      email: "google@example.com",
      full_name: "G User",
      password_hash: null,
      school: null,
      date_of_birth: null,
      avatar_url: null,
      role: "student",
      tier: "free",
      status: "active",
      email_verified_at: new Date().toISOString(),
      oauth_provider: "google",
      oauth_sub: "gsub",
      profile_completed: true,
      last_login_at: null,
      created_at: "",
      updated_at: "",
    };
    await requestPasswordReset("google@example.com");
    expect(emailService.sendTransactionalEmail).toHaveBeenCalled();
  });

  it("requestPasswordReset no-ops for unknown email", async () => {
    await requestPasswordReset("missing@example.com");
    expect(
      emailService.sendTransactionalEmail as unknown as Mock,
    ).not.toHaveBeenCalled();
  });
});
