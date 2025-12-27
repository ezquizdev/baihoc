import type { AllowlistRow } from "@/application/infra/db/allowlistRepo";
import type { MembershipHistoryRow } from "@/application/infra/db/membershipRepo";
import type { UserRow } from "@/application/infra/db/userRepo";
import type { UserStatusChangeRow } from "@/application/infra/db/userStatusRepo";
import type { UserRole, UserStatus, UserTier } from "@/application/models/user";
import type {
  AllowlistEntry,
  MembershipHistoryEntry,
  UserAdminDetail,
  UserAdminSummary,
  UserHistory,
  UserStatusChangeEntry,
} from "@/application/models/userAdmin";
import {
  addAllowlistBulk,
  addAllowlistEmail,
  adminSendPasswordReset,
  getAllowlistWithTotal,
  getUserById,
  getUserHistory,
  listUsersWithTotal,
  removeAllowlist,
  searchUserByEmail,
  updateUserAdmin,
  verifyUserEmail,
} from "@/application/services/userAdminService";

const toAdminSummary = (row: UserRow): UserAdminSummary => ({
  id: row.id,
  email: row.email,
  fullName: row.full_name,
  role: row.role,
  tier: row.tier,
  status: row.status,
  emailVerifiedAt: row.email_verified_at,
  profileCompleted: row.profile_completed,
  createdAt: row.created_at,
  lastLoginAt: row.last_login_at,
});

const toAdminDetail = (row: UserRow): UserAdminDetail => ({
  ...toAdminSummary(row),
  avatarUrl: row.avatar_url,
  school: row.school,
  dateOfBirth: row.date_of_birth,
});

const toMembershipEntry = (
  row: MembershipHistoryRow,
): MembershipHistoryEntry => ({
  id: row.id,
  userId: row.user_id,
  fromTier: row.from_tier,
  toTier: row.to_tier,
  reason: row.reason,
  changedBy: row.changed_by,
  createdAt: row.created_at,
});

const toStatusEntry = (row: UserStatusChangeRow): UserStatusChangeEntry => ({
  id: row.id,
  userId: row.user_id,
  fromStatus: row.from_status,
  toStatus: row.to_status,
  reason: row.reason,
  changedBy: row.changed_by,
  createdAt: row.created_at,
});

const toAllowlistEntry = (row: AllowlistRow): AllowlistEntry => ({
  email: row.email,
  role: row.role,
  tier: row.tier,
  addedBy: row.added_by,
  createdAt: row.created_at,
});

export async function controllerAdminListUsers(filters: {
  search?: string;
  role?: UserRole;
  tier?: UserTier;
  status?: UserStatus;
  limit?: number;
  offset?: number;
}) {
  const { items, total } = await listUsersWithTotal(filters);
  return { items: items.map(toAdminSummary), total };
}

export async function controllerAdminUpdateUser(input: {
  userId: string;
  role?: UserRole;
  tier?: UserTier;
  status?: UserStatus;
  reason?: string | null;
  actorUserId: string;
}) {
  const updated = await updateUserAdmin(input);
  return toAdminDetail(updated);
}

export async function controllerAdminSearchByEmail(email: string) {
  const found = await searchUserByEmail(email);
  return found ? toAdminDetail(found) : null;
}

export async function controllerAdminGetUser(userId: string) {
  const user = await getUserById(userId);
  return toAdminDetail(user);
}

export async function controllerAdminUserHistory(
  userId: string,
): Promise<UserHistory> {
  const history = await getUserHistory(userId);
  return {
    membership: history.membership.map(toMembershipEntry),
    status: history.status.map(toStatusEntry),
  };
}

export async function controllerAdminAllowlistList(options?: {
  limit?: number;
  offset?: number;
  search?: string;
}) {
  const result = await getAllowlistWithTotal(options);
  return {
    items: result.items.map(toAllowlistEntry),
    total: result.total,
  };
}

export async function controllerAdminAllowlistAdd(input: {
  email: string;
  role?: UserRole;
  tier?: UserTier;
  actorUserId: string;
}) {
  await addAllowlistEmail(input);
}

export async function controllerAdminAllowlistBulk(
  entries: Array<{ email: string; role?: UserRole; tier?: UserTier }>,
  actorUserId: string,
) {
  return addAllowlistBulk(entries, actorUserId);
}

export async function controllerAdminAllowlistRemove(input: {
  email: string;
  actorUserId: string;
}) {
  await removeAllowlist(input);
}

export async function controllerAdminVerifyEmail(input: {
  userId: string;
  actorUserId: string;
  reason?: string | null;
}) {
  const updated = await verifyUserEmail(input);
  return toAdminDetail(updated);
}

export async function controllerAdminTriggerPasswordReset(input: {
  userId: string;
  actorUserId: string;
}) {
  await adminSendPasswordReset(input);
}
