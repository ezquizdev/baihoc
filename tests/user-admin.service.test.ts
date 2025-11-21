import { beforeEach, describe, expect, it, vi } from "vitest";

type MockUser = {
  id: string;
  email: string;
  full_name: string;
  role: "student" | "staff";
  tier: "free" | "paid";
  status: "pending_verification" | "active" | "deactivated";
};

type MockMembership = {
  userId: string;
  fromTier?: "free" | "paid";
  toTier?: "free" | "paid";
};

type MockStatusChange = {
  userId: string;
  fromStatus?: MockUser["status"];
  toStatus?: MockUser["status"];
};

type MockAudit = {
  targetId?: string | null;
  metadata?: Record<string, unknown> | null;
};

type AllowlistRecord = {
  email: string;
  role: "student" | "staff";
  tier: "free" | "paid";
};

vi.mock("@/application/infra/db/userRepo", () => {
  const store: Record<string, MockUser> = {};
  return {
    __store: store,
    listUsers: vi.fn(async () => Object.values(store)),
    countUsers: vi.fn(async () => Object.values(store).length),
    findUserById: vi.fn(async (id: string) => store[id] ?? null),
    findUserByEmail: vi.fn(async (email: string) => store[email] ?? null),
    adminUpdateUser: vi.fn(async (id: string, input: Partial<MockUser>) => {
      const user = store[id];
      if (!user) return null;
      const updated: MockUser = {
        ...user,
        role: (input.role as MockUser["role"] | undefined) ?? user.role,
        tier: (input.tier as MockUser["tier"] | undefined) ?? user.tier,
        status: (input.status as MockUser["status"] | undefined) ?? user.status,
      };
      store[id] = updated;
      return updated;
    }),
  };
});

vi.mock("@/application/infra/db/membershipRepo", () => {
  const records: MockMembership[] = [];
  return {
    __records: records,
    insertMembershipHistory: vi.fn(async (input: MockMembership) => {
      records.push(input);
    }),
    listMembershipHistory: vi.fn(async () => records),
  };
});

vi.mock("@/application/infra/db/userStatusRepo", () => {
  const records: MockStatusChange[] = [];
  return {
    __records: records,
    insertUserStatusChange: vi.fn(async (input: MockStatusChange) => {
      records.push(input);
    }),
    listUserStatusChanges: vi.fn(async () => records),
  };
});

vi.mock("@/application/infra/db/allowlistRepo", () => {
  const records: AllowlistRecord[] = [];
  return {
    __records: records,
    listAllowlist: vi.fn(async () =>
      records.map((entry) => ({
        email: entry.email,
        role: entry.role,
        tier: entry.tier,
        added_by: null,
        created_at: "",
      })),
    ),
    insertAllowlistEmail: vi.fn(
      async (input: { email: string; role?: string; tier?: string }) => {
        const existing = records.find((r) => r.email === input.email);
        const nextRole =
          (input.role as AllowlistRecord["role"] | undefined) ??
          existing?.role ??
          "student";
        const nextTier =
          (input.tier as AllowlistRecord["tier"] | undefined) ??
          existing?.tier ??
          "paid";
        if (existing) {
          existing.role = nextRole;
          existing.tier = nextTier;
          return;
        }
        records.push({ email: input.email, role: nextRole, tier: nextTier });
      },
    ),
    removeAllowlistEmail: vi.fn(async (email: string) => {
      const idx = records.findIndex((r) => r.email === email);
      if (idx >= 0) records.splice(idx, 1);
    }),
  };
});

vi.mock("@/application/infra/db/auditRepo", () => {
  const logs: MockAudit[] = [];
  return {
    __logs: logs,
    insertAuditLog: vi.fn(async (input: MockAudit) => logs.push(input)),
  };
});

const userRepo = await import("@/application/infra/db/userRepo");
const membershipRepo = await import("@/application/infra/db/membershipRepo");
const statusRepo = await import("@/application/infra/db/userStatusRepo");
const allowlistRepo = await import("@/application/infra/db/allowlistRepo");
const auditRepo = await import("@/application/infra/db/auditRepo");

const {
  addAllowlistEmail,
  getAllowlist,
  getUserHistory,
  listUsersWithTotal,
  removeAllowlist,
  searchUserByEmail,
  updateUserAdmin,
} = await import("@/application/services/userAdminService");

describe("userAdminService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const userStore = (
      userRepo as unknown as { __store: Record<string, MockUser> }
    ).__store;
    Object.keys(userStore).forEach((k) => {
      delete userStore[k];
    });
    (
      membershipRepo as unknown as { __records: MockMembership[] }
    ).__records.length = 0;
    (
      statusRepo as unknown as { __records: MockStatusChange[] }
    ).__records.length = 0;
    (
      allowlistRepo as unknown as { __records: AllowlistRecord[] }
    ).__records.length = 0;
    (auditRepo as unknown as { __logs: MockAudit[] }).__logs.length = 0;
  });

  it("lists users with total count", async () => {
    const userStore = (
      userRepo as unknown as { __store: Record<string, MockUser> }
    ).__store;
    userStore.u1 = {
      id: "u1",
      email: "a@example.com",
      full_name: "A",
      role: "student",
      tier: "free",
      status: "active",
    };
    const { items, total } = await listUsersWithTotal({});
    expect(items).toHaveLength(1);
    expect(total).toBe(1);
  });

  it("updates user and records membership/status changes plus audit", async () => {
    const userStore = (
      userRepo as unknown as { __store: Record<string, MockUser> }
    ).__store;
    userStore.u1 = {
      id: "u1",
      email: "a@example.com",
      full_name: "A",
      role: "student",
      tier: "free",
      status: "active",
    };
    const updated = await updateUserAdmin({
      userId: "u1",
      tier: "paid",
      status: "deactivated",
      actorUserId: "staff1",
      reason: "test-change",
    });
    expect(updated.tier).toBe("paid");
    expect(updated.status).toBe("deactivated");
    const membershipRecords = (
      membershipRepo as unknown as { __records: MockMembership[] }
    ).__records;
    const statusRecords = (
      statusRepo as unknown as { __records: MockStatusChange[] }
    ).__records;
    const auditLogs = (auditRepo as unknown as { __logs: MockAudit[] }).__logs;
    expect(membershipRecords).toHaveLength(1);
    expect(statusRecords).toHaveLength(1);
    expect(auditLogs).toHaveLength(1);
    expect(auditLogs[0].targetId).toBe("u1");
  });

  it("searches user by email in lowercase", async () => {
    const userStore = (
      userRepo as unknown as { __store: Record<string, MockUser> }
    ).__store;
    userStore["b@example.com"] = {
      id: "u2",
      email: "b@example.com",
      full_name: "B",
      role: "student",
      tier: "free",
      status: "active",
    };
    const found = await searchUserByEmail("B@Example.com");
    expect(found?.id).toBe("u2");
  });

  it("returns membership/status history snapshot", async () => {
    const userStore = (
      userRepo as unknown as { __store: Record<string, MockUser> }
    ).__store;
    userStore.u1 = {
      id: "u1",
      email: "a@example.com",
      full_name: "A",
      role: "student",
      tier: "free",
      status: "active",
    };
    await (
      membershipRepo as unknown as {
        insertMembershipHistory: (input: MockMembership) => Promise<void>;
      }
    ).insertMembershipHistory({
      userId: "u1",
      fromTier: "free",
      toTier: "paid",
    });
    await (
      statusRepo as unknown as {
        insertUserStatusChange: (input: MockStatusChange) => Promise<void>;
      }
    ).insertUserStatusChange({
      userId: "u1",
      fromStatus: "active",
      toStatus: "deactivated",
    });
    const history = await getUserHistory("u1");
    expect(history.membership).toHaveLength(1);
    expect(history.status).toHaveLength(1);
  });

  it("adds and removes allowlist entries with audit logs", async () => {
    await addAllowlistEmail({
      email: "whitelist@example.com",
      role: "student",
      tier: "paid",
      actorUserId: "staff1",
    });
    const allowlistRecords = (
      allowlistRepo as unknown as { __records: AllowlistRecord[] }
    ).__records;
    const auditLogs = (auditRepo as unknown as { __logs: MockAudit[] }).__logs;
    expect(allowlistRecords).toContainEqual({
      email: "whitelist@example.com",
      role: "student",
      tier: "paid",
    });
    expect(auditLogs).toHaveLength(1);
    expect(auditLogs[0].targetId ?? null).toBeNull();
    await removeAllowlist({
      email: "whitelist@example.com",
      actorUserId: "staff1",
    });
    expect(allowlistRecords).toHaveLength(0);
    expect(auditLogs).toHaveLength(2);
    expect(auditLogs[1].targetId ?? null).toBeNull();
    const list = await getAllowlist();
    expect(list).toHaveLength(0);
  });
});
