import bcrypt from "bcryptjs";
import {
  consumeEmailVerificationToken,
  consumePasswordResetToken,
  createEmailVerificationToken,
  createPasswordResetToken,
} from "@/application/infra/db/tokenRepo";
import {
  createUser,
  findUserByEmail,
  findUserByOAuth,
  markEmailVerified,
  type OAuthProvider,
  updateLastLogin,
  updatePassword,
  updateUserProfile,
} from "@/application/infra/db/userRepo";
import { sendTransactionalEmail } from "@/application/services/emailService";
import { siteConfig } from "@/config/site";
import { env } from "@/core/env";

const VERIFICATION_TTL_MINUTES = 60 * 24; // 24 hours
const RESET_TTL_MINUTES = 60; // 1 hour

function ensurePasswordStrength(password: string) {
  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters");
  }
}

export async function registerWithEmail(input: {
  email: string;
  password: string;
  fullName: string;
  school?: string | null;
  dateOfBirth?: string | null;
  avatarUrl?: string | null;
}) {
  const existing = await findUserByEmail(input.email);
  if (existing) {
    throw new Error("Email already registered");
  }
  ensurePasswordStrength(input.password);
  const passwordHash = await bcrypt.hash(input.password, 10);
  const user = await createUser({
    email: input.email,
    password_hash: passwordHash,
    full_name: input.fullName,
    school: input.school,
    date_of_birth: input.dateOfBirth,
    avatar_url: input.avatarUrl,
    status: "pending_verification",
    profile_completed: true,
  });

  const rawToken = await createEmailVerificationToken(
    user.id,
    VERIFICATION_TTL_MINUTES,
  );
  const verifyLink = `${env.NEXT_PUBLIC_APP_URL}/auth/verify?token=${rawToken}`;
  await sendTransactionalEmail({
    to: [{ email: user.email, name: user.full_name }],
    subject: "Verify your BaiHoc account",
    text: `Hello ${user.full_name},\n\nPlease verify your email by visiting: ${verifyLink}\n\nThanks,\n${siteConfig.name} Team`,
  });

  return user;
}

export async function verifyEmailWithToken(rawToken: string) {
  const tokenRow = await consumeEmailVerificationToken(rawToken);
  if (!tokenRow) {
    throw new Error("Invalid or expired verification token");
  }
  await markEmailVerified(tokenRow.user_id);
  return tokenRow.user_id;
}

export async function loginWithEmail(input: {
  email: string;
  password: string;
}) {
  const user = await findUserByEmail(input.email);
  if (!user || !user.password_hash) {
    throw new Error("Invalid credentials");
  }
  const valid = await bcrypt.compare(input.password, user.password_hash);
  if (!valid) {
    throw new Error("Invalid credentials");
  }
  if (user.status === "pending_verification") {
    throw new Error("Email not verified");
  }
  await updateLastLogin(user.id);
  return user;
}

export async function requestPasswordReset(email: string) {
  const user = await findUserByEmail(email);
  if (!user) {
    return;
  }
  const rawToken = await createPasswordResetToken(user.id, RESET_TTL_MINUTES);
  const resetLink = `${env.NEXT_PUBLIC_APP_URL}/auth/reset?token=${rawToken}`;
  await sendTransactionalEmail({
    to: [{ email: user.email, name: user.full_name }],
    subject: "Reset your BaiHoc password",
    text: `Hello ${user.full_name},\n\nReset your password using: ${resetLink}\n\nIf you didn't request this, you can ignore this email.`,
  });
}

export async function resetPasswordWithToken(
  rawToken: string,
  newPassword: string,
) {
  ensurePasswordStrength(newPassword);
  const tokenRow = await consumePasswordResetToken(rawToken);
  if (!tokenRow) {
    throw new Error("Invalid or expired reset token");
  }
  const passwordHash = await bcrypt.hash(newPassword, 10);
  await updatePassword(tokenRow.user_id, passwordHash);
}

export async function upsertGoogleUser(input: {
  sub: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
  school?: string | null;
  dateOfBirth?: string | null;
  profileCompleted?: boolean;
}) {
  const provider: OAuthProvider = "google";
  const existing = await findUserByOAuth(provider, input.sub);
  if (existing) {
    const updated = await updateUserProfile(existing.id, {
      full_name: input.fullName,
      avatar_url: input.avatarUrl,
      school: input.school,
      date_of_birth: input.dateOfBirth,
      profile_completed: input.profileCompleted ?? existing.profile_completed,
    });
    await markEmailVerified(existing.id);
    await updateLastLogin(existing.id);
    return updated ?? existing;
  }

  const byEmail = await findUserByEmail(input.email);
  if (byEmail && byEmail.oauth_provider !== provider) {
    throw new Error(
      "Email already registered with password; link flow not implemented",
    );
  }

  const user = await createUser({
    email: input.email,
    password_hash: null,
    full_name: input.fullName ?? input.email,
    avatar_url: input.avatarUrl ?? null,
    school: input.school ?? null,
    date_of_birth: input.dateOfBirth ?? null,
    oauth_provider: provider,
    oauth_sub: input.sub,
    status: "active",
    email_verified_at: new Date().toISOString(),
    profile_completed: input.profileCompleted ?? false,
  });
  await updateLastLogin(user.id);
  return user;
}

export async function completeProfile(
  userId: string,
  input: {
    fullName: string;
    school?: string | null;
    dateOfBirth?: string | null;
    avatarUrl?: string | null;
  },
) {
  const updated = await updateUserProfile(userId, {
    full_name: input.fullName,
    school: input.school,
    date_of_birth: input.dateOfBirth,
    avatar_url: input.avatarUrl,
    profile_completed: true,
  });
  if (!updated) {
    throw new Error("User not found");
  }
  return updated;
}
