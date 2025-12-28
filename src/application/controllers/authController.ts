import type { UserRow } from "@/application/infra/db/userRepo";
import type { SessionUser, User } from "@/application/models/user";
import {
  changePasswordForUser,
  completeProfile,
  googleLogin,
  googleRegister,
  loginWithEmail,
  registerWithEmail,
  requestPasswordReset,
  resetPasswordWithToken,
  verifyEmailWithToken,
  verifyResetToken,
} from "@/application/services/authService";

type AuthResult = { user: User; sessionUser: SessionUser };

const toSessionUser = (user: User): SessionUser => ({
  id: user.id,
  email: user.email,
  role: user.role,
  tier: user.tier,
  profileCompleted: user.profileCompleted,
  fullName: user.fullName,
  avatarUrl: user.avatarUrl,
});

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

export async function controllerLoginWithEmail(input: {
  email: string;
  password: string;
}): Promise<AuthResult> {
  const user = await loginWithEmail(input);
  const domainUser = toDomainUser(user);
  return { user: domainUser, sessionUser: toSessionUser(domainUser) };
}

export async function controllerRegisterWithEmail(input: {
  email: string;
  password: string;
  fullName: string;
  school?: string | null;
  dateOfBirth?: string | null;
  avatarUrl?: string | null;
}): Promise<AuthResult> {
  const user = await registerWithEmail(input);
  const domainUser = toDomainUser(user);
  return { user: domainUser, sessionUser: toSessionUser(domainUser) };
}

export async function controllerGoogleRegister(input: {
  accessToken: string;
  school?: string | null;
  dateOfBirth?: string | null;
}): Promise<AuthResult> {
  const user = await googleRegister(input);
  const domainUser = toDomainUser(user);
  return { user: domainUser, sessionUser: toSessionUser(domainUser) };
}

export async function controllerGoogleLogin(input: {
  accessToken: string;
  school?: string | null;
  dateOfBirth?: string | null;
}): Promise<AuthResult> {
  const user = await googleLogin(input);
  const domainUser = toDomainUser(user);
  return { user: domainUser, sessionUser: toSessionUser(domainUser) };
}

export async function controllerCompleteProfile(input: {
  userId: string;
  fullName: string;
  school?: string | null;
  dateOfBirth?: string | null;
  avatarUrl?: string | null;
}): Promise<AuthResult> {
  const user = await completeProfile(input.userId, {
    fullName: input.fullName,
    school: input.school,
    dateOfBirth: input.dateOfBirth,
    avatarUrl: input.avatarUrl,
  });
  const domainUser = toDomainUser(user);
  return { user: domainUser, sessionUser: toSessionUser(domainUser) };
}

export async function controllerRequestPasswordReset(email: string) {
  await requestPasswordReset(email);
}

export async function controllerVerifyResetToken(token: string) {
  return verifyResetToken(token);
}

export async function controllerResetPassword(
  token: string,
  newPassword: string,
) {
  await resetPasswordWithToken(token, newPassword);
}

export async function controllerChangePassword(input: {
  userId: string;
  currentPassword?: string | null;
  newPassword: string;
  newPasswordConfirm?: string;
}) {
  await changePasswordForUser(input.userId, {
    currentPassword: input.currentPassword ?? null,
    newPassword: input.newPassword,
    newPasswordConfirm: input.newPasswordConfirm,
  });
}

export async function controllerVerifyEmail(token: string) {
  return verifyEmailWithToken(token);
}
