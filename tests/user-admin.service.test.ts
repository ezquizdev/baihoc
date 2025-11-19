import { beforeEach, describe, expect, it, vi } from "vitest";

type MockUser = {
  id: string;
  email: string;
  full_name: string;
  role: "student" | "staff";
  tier: "free" | "paid";
  status: "pending_verification" | "active" | "suspended" | "deactivated";
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
  const emails: string[] = [];
  return {
    __records: emails,
    listAllowlist: vi.fn(async () =>
      emails.map((email) => ({ email, added_by: null, created_at: "" })),
    ),
    insertAllowlistEmail: vi.fn(async (email: string) => {
      if (!emails.includes(email)) emails.push(email);
    }),
    removeAllowlistEmail: vi.fn(async (email: string) => {
      const idx = emails.indexOf(email);
      if (idx >= 0) emails.splice(idx, 1);
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
    (allowlistRepo as unknown as { __records: string[] }).__records.length = 0;
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
      status: "suspended",
      actorUserId: "staff1",
      reason: "test-change",
    });
    expect(updated.tier).toBe("paid");
    expect(updated.status).toBe("suspended");
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
      toStatus: "suspended",
    });
    const history = await getUserHistory("u1");
    expect(history.membership).toHaveLength(1);
    expect(history.status).toHaveLength(1);
  });

  it("adds and removes allowlist entries with audit logs", async () => {
    await addAllowlistEmail("whitelist@example.com", "staff1");
    const allowlistRecords = (
      allowlistRepo as unknown as { __records: string[] }
    ).__records;
    const auditLogs = (auditRepo as unknown as { __logs: MockAudit[] }).__logs;
    expect(allowlistRecords).toContain("whitelist@example.com");
    expect(auditLogs).toHaveLength(1);
    await removeAllowlist("whitelist@example.com", "staff1");
    expect(allowlistRecords).not.toContain("whitelist@example.com");
    expect(auditLogs).toHaveLength(2);
    const list = await getAllowlist();
    expect(list).toHaveLength(0);
  });
});
