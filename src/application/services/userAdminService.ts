import {
  insertAllowlistEmail,
  listAllowlist,
  removeAllowlistEmail,
} from "@/application/infra/db/allowlistRepo";
import { insertAuditLog } from "@/application/infra/db/auditRepo";
import {
  insertMembershipHistory,
  listMembershipHistory,
} from "@/application/infra/db/membershipRepo";
import {
  adminUpdateUser,
  countUsers,
  findUserByEmail,
  findUserById,
  listUsers,
  markEmailVerified,
  type UserListFilters,
} from "@/application/infra/db/userRepo";
import {
  insertUserStatusChange,
  listUserStatusChanges,
} from "@/application/infra/db/userStatusRepo";
import { requestPasswordReset } from "@/application/services/authService";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function listUsersWithTotal(filters: UserListFilters) {
  const [items, total] = await Promise.all([
    listUsers(filters),
    countUsers(filters),
  ]);
  return { items, total };
}

export async function updateUserAdmin(input: {
  userId: string;
  role?: "student" | "staff";
  tier?: "free" | "paid";
  status?: "pending_verification" | "active" | "suspended" | "deactivated";
  reason?: string | null;
  actorUserId: string;
}) {
  const current = await findUserById(input.userId);
  if (!current) {
    throw new Error("User not found");
  }

  const updated = await adminUpdateUser(input.userId, {
    role: input.role,
    tier: input.tier,
    status: input.status,
  });
  if (!updated) throw new Error("Failed to update user");

  const auditPayload = {
    before: { role: current.role, tier: current.tier, status: current.status },
    after: { role: updated.role, tier: updated.tier, status: updated.status },
  };
  const reason = input.reason ?? null;

  if (input.tier && input.tier !== current.tier) {
    await insertMembershipHistory({
      userId: input.userId,
      fromTier: current.tier,
      toTier: input.tier,
      reason,
      changedBy: input.actorUserId,
    });
  }

  if (input.status && input.status !== current.status) {
    await insertUserStatusChange({
      userId: input.userId,
      fromStatus: current.status,
      toStatus: input.status,
      reason,
      changedBy: input.actorUserId,
    });
  }

  await insertAuditLog({
    actorUserId: input.actorUserId,
    action: "user_admin_update",
    targetType: "user",
    targetId: input.userId,
    metadata: { ...auditPayload, reason },
  });

  return updated;
}

export async function searchUserByEmail(email: string) {
  return findUserByEmail(normalizeEmail(email));
}

export async function getUserHistory(userId: string) {
  const [membership, status] = await Promise.all([
    listMembershipHistory(userId),
    listUserStatusChanges(userId),
  ]);
  return { membership, status };
}

export async function getAllowlist(options?: {
  limit?: number;
  offset?: number;
}) {
  return listAllowlist(options?.limit, options?.offset);
}

export async function addAllowlistEmail(email: string, actorUserId: string) {
  await insertAllowlistEmail(normalizeEmail(email), actorUserId);
  await insertAuditLog({
    actorUserId,
    action: "allowlist_add",
    targetType: "allowlist_email",
    targetId: normalizeEmail(email),
  });
}

export async function removeAllowlist(email: string, actorUserId: string) {
  await removeAllowlistEmail(normalizeEmail(email));
  await insertAuditLog({
    actorUserId,
    action: "allowlist_remove",
    targetType: "allowlist_email",
    targetId: normalizeEmail(email),
  });
}

export async function addAllowlistBulk(
  emails: string[],
  actorUserId: string,
): Promise<{ added: number }> {
  const unique = Array.from(
    new Set(emails.map((e) => normalizeEmail(e)).filter(Boolean)),
  );
  let added = 0;
  for (const email of unique) {
    await insertAllowlistEmail(email, actorUserId);
    await insertAuditLog({
      actorUserId,
      action: "allowlist_add",
      targetType: "allowlist_email",
      targetId: email,
    });
    added += 1;
  }
  return { added };
}

export async function getUserById(userId: string) {
  const user = await findUserById(userId);
  if (!user) throw new Error("User not found");
  return user;
}

export async function verifyUserEmail(input: {
  userId: string;
  actorUserId: string;
  reason?: string | null;
}) {
  const current = await getUserById(input.userId);
  const updated = await markEmailVerified(input.userId);
  if (!updated) throw new Error("Failed to verify email");

  if (current.status !== updated.status) {
    await insertUserStatusChange({
      userId: input.userId,
      fromStatus: current.status,
      toStatus: updated.status,
      reason: input.reason ?? null,
      changedBy: input.actorUserId,
    });
  }

  await insertAuditLog({
    actorUserId: input.actorUserId,
    action: "user_admin_verify_email",
    targetType: "user",
    targetId: input.userId,
    metadata: { reason: input.reason ?? null },
  });

  return updated;
}

export async function adminSendPasswordReset(input: {
  userId: string;
  actorUserId: string;
}) {
  const user = await getUserById(input.userId);
  await requestPasswordReset(user.email);
  await insertAuditLog({
    actorUserId: input.actorUserId,
    action: "user_admin_trigger_reset",
    targetType: "user",
    targetId: input.userId,
  });
}
