export type UserRole = "student" | "staff";
export type UserTier = "free" | "paid";
export type UserStatus =
  | "pending_verification"
  | "active"
  | "suspended"
  | "deactivated";

export type User = {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  tier: UserTier;
  status: UserStatus;
  emailVerifiedAt: string | null;
  avatarUrl: string | null;
  school: string | null;
  dateOfBirth: string | null;
  profileCompleted: boolean;
};

export type SessionUser = {
  id: string;
  email: string;
  role: UserRole;
  profileCompleted: boolean;
  fullName?: string | null;
  avatarUrl?: string | null;
};
