import type { UserRow } from "@/application/infra/db/userRepo";
import type { User } from "@/application/models/user";
import {
  addAllowlistBulk,
  addAllowlistEmail,
  adminSendPasswordReset,
  getAllowlist,
  getUserById,
  getUserHistory,
  listUsersWithTotal,
  removeAllowlist,
  searchUserByEmail,
  updateUserAdmin,
  verifyUserEmail,
} from "@/application/services/userAdminService";

const toDomainUser = (row: UserRow): User => ({
  id: row.id,
  email: row.email,
  fullName: row.full_name,
  role: row.role,
  tier: row.tier,
  status: row.status,
  emailVerifiedAt: row.email_verified_at,
  avatarUrl: row.avatar_url,
  school: row.school,
  dateOfBirth: row.date_of_birth,
  profileCompleted: row.profile_completed,
});

export async function controllerAdminListUsers(filters: {
  search?: string;
  role?: "student" | "staff";
  tier?: "free" | "paid";
  status?: "pending_verification" | "active" | "suspended" | "deactivated";
  limit?: number;
  offset?: number;
}) {
  const { items, total } = await listUsersWithTotal(filters);
  return { items: items.map(toDomainUser), total };
}

export async function controllerAdminUpdateUser(input: {
  userId: string;
  role?: "student" | "staff";
  tier?: "free" | "paid";
  status?: "pending_verification" | "active" | "suspended" | "deactivated";
  reason?: string | null;
  actorUserId: string;
}) {
  const updated = await updateUserAdmin(input);
  return toDomainUser(updated);
}

export async function controllerAdminSearchByEmail(email: string) {
  const found = await searchUserByEmail(email);
  return found ? toDomainUser(found) : null;
}

export async function controllerAdminGetUser(userId: string) {
  const user = await getUserById(userId);
  return toDomainUser(user);
}

export async function controllerAdminUserHistory(userId: string) {
  return getUserHistory(userId);
}

export async function controllerAdminAllowlistList(options?: {
  limit?: number;
  offset?: number;
}) {
  return getAllowlist(options);
}

export async function controllerAdminAllowlistAdd(
  email: string,
  actorUserId: string,
) {
  await addAllowlistEmail(email, actorUserId);
}

export async function controllerAdminAllowlistBulk(
  emails: string[],
  actorUserId: string,
) {
  return addAllowlistBulk(emails, actorUserId);
}

export async function controllerAdminAllowlistRemove(
  email: string,
  actorUserId: string,
) {
  await removeAllowlist(email, actorUserId);
}

export async function controllerAdminVerifyEmail(input: {
  userId: string;
  actorUserId: string;
  reason?: string | null;
}) {
  const updated = await verifyUserEmail(input);
  return toDomainUser(updated);
}

export async function controllerAdminTriggerPasswordReset(input: {
  userId: string;
  actorUserId: string;
}) {
  await adminSendPasswordReset(input);
}
