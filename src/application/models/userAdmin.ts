import type { UserRole, UserStatus, UserTier } from "@/application/models/user";

export type UserAdminSummary = {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  tier: UserTier;
  status: UserStatus;
  emailVerifiedAt: string | null;
  profileCompleted: boolean;
  createdAt: string;
  lastLoginAt: string | null;
};

export type UserAdminDetail = UserAdminSummary & {
  avatarUrl: string | null;
  school: string | null;
  dateOfBirth: string | null;
};

export type MembershipHistoryEntry = {
  id: string;
  userId: string;
  fromTier: UserTier;
  toTier: UserTier;
  reason: string | null;
  changedBy: string | null;
  createdAt: string;
};

export type UserStatusChangeEntry = {
  id: string;
  userId: string;
  fromStatus: UserStatus;
  toStatus: UserStatus;
  reason: string | null;
  changedBy: string | null;
  createdAt: string;
};

export type UserHistory = {
  membership: MembershipHistoryEntry[];
  status: UserStatusChangeEntry[];
};

export type AllowlistEntry = {
  email: string;
  role: UserRole;
  tier: UserTier;
  addedBy: string | null;
  createdAt: string;
};
