import bcrypt from "bcryptjs";
import { beforeEach, describe, expect, it, vi } from "vitest";

type MockUser = {
  id: string;
  email: string;
  full_name: string;
  password_hash: string | null;
  school: string | null;
  date_of_birth: string | null;
  avatar_url: string | null;
  role: string;
  tier: string;
  status: string;
  email_verified_at: string | null;
  oauth_provider: string | null;
  oauth_sub: string | null;
  profile_completed: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
};

vi.mock("@/application/infra/db/userRepo", () => {
  const store: Record<string, MockUser> = {};
  return {
    __store: store,
    createUser: vi.fn(async (input) => {
      const user = {
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
        user.oauth_provider = provider;
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
      async (userId: string, input: Partial<MockUser>) => {
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
      return userId ? { user_id: userId } : null;
    }),
    createPasswordResetToken: vi.fn(async (userId: string) => {
      resetMap.set("reset-token", userId);
      return "reset-token";
    }),
    consumePasswordResetToken: vi.fn(async (token: string) => {
      const userId = token === "good-reset" ? "user-id" : resetMap.get(token);
      return userId ? { user_id: userId } : null;
    }),
    isPasswordResetTokenValid: vi.fn(async (token: string) => {
      const userId = token === "good-reset" ? "user-id" : resetMap.get(token);
      return userId ? { user_id: userId } : null;
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
  __store: Record<string, MockUser>;
};
const tokenRepo = await import("@/application/infra/db/tokenRepo");
const emailService = await import("@/application/services/emailService");

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
    for (const k of Object.keys(userRepo.__store)) {
      delete userRepo.__store[k];
    }
  });

  it("registerWithEmail hashes password, enforces confirm, and sends verify email", async () => {
    const user = await registerWithEmail({
      email: "test@example.com",
      password: "Password123!",
      passwordConfirm: "Password123!",
      fullName: "Tester",
    });

    const created = userRepo.__store["test@example.com"];
    expect(created).toBeDefined();
    expect(created.password_hash).toBeTruthy();
    expect(await bcrypt.compare("Password123!", created.password_hash)).toBe(
      true,
    );
    expect(tokenRepo.createEmailVerificationToken).toHaveBeenCalledWith(
      user.id,
      expect.any(Number),
    );
    expect(emailService.sendTransactionalEmail).toHaveBeenCalledTimes(1);
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

  it("loginWithEmail rejects unverified/suspended/deactivated", async () => {
    const baseUser = {
      email: "u@example.com",
      full_name: "U",
      password_hash: await bcrypt.hash("pass1234", 10),
      role: "student",
      tier: "free",
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
    vi.mocked(userRepo.findUserByEmail).mockResolvedValueOnce({
      ...baseUser,
      id: "u1",
      status: "pending_verification",
    });
    await expect(
      loginWithEmail({ email: "u@example.com", password: "pass1234" }),
    ).rejects.toThrow(/chưa được xác minh/);

    vi.mocked(userRepo.findUserByEmail).mockResolvedValueOnce({
      ...baseUser,
      id: "u2",
      status: "suspended",
    });
    await expect(
      loginWithEmail({ email: "u@example.com", password: "pass1234" }),
    ).rejects.toThrow(/tạm khóa/);

    vi.mocked(userRepo.findUserByEmail).mockResolvedValueOnce({
      ...baseUser,
      id: "u3",
      status: "deactivated",
    });
    await expect(
      loginWithEmail({ email: "u@example.com", password: "pass1234" }),
    ).rejects.toThrow(/vô hiệu hóa/);
  });

  it("googleLogin enforces status", async () => {
    vi.mocked(userRepo.findUserByEmail).mockResolvedValueOnce({
      id: "g1",
      email: "g@example.com",
      password_hash: null,
      full_name: "G",
      role: "student",
      tier: "free",
      status: "suspended",
      email_verified_at: new Date().toISOString(),
      oauth_provider: "google",
      oauth_sub: "sub",
      profile_completed: true,
      avatar_url: null,
      school: null,
      date_of_birth: null,
    });

    await expect(
      googleLogin({ sub: "sub", email: "g@example.com" }),
    ).rejects.toThrow(/tạm khóa/);
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
    vi.mocked(userRepo.findUserByEmail).mockResolvedValueOnce(null);
    await expect(
      googleLogin({ sub: "newsub", email: "none@example.com" }),
    ).rejects.toThrow(/chưa được đăng ký/);
  });

  it("googleLogin links OAuth to password account", async () => {
    userRepo.__store["link@example.com"] = {
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
    vi.mocked(userRepo.findUserByEmail).mockResolvedValueOnce({
      ...userRepo.__store["link@example.com"],
    });
    vi.mocked(userRepo.linkUserOAuth).mockImplementation(
      async (_id, provider, sub) => {
        const user = userRepo.__store["link@example.com"];
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
    const stored = userRepo.__store[user.email];
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
    vi.mocked(tokenRepo.consumePasswordResetToken).mockResolvedValueOnce({
      user_id: "r@example.com",
    });
    await resetPasswordWithToken("good-reset", "NewPass123!");
    const stored = userRepo.__store["r@example.com"];
    expect(await bcrypt.compare("NewPass123!", stored.password_hash)).toBe(
      true,
    );
  });

  it("allows password reset request for Google-only account", async () => {
    userRepo.__store["google@example.com"] = {
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
      vi.mocked(emailService.sendTransactionalEmail),
    ).not.toHaveBeenCalled();
  });
});
