import bcrypt from "bcryptjs";
import { findAllowlistEntryByEmail } from "@/application/infra/db/allowlistRepo";
import { insertAllowlistUpgrade } from "@/application/infra/db/membershipRepo";
import {
  consumeEmailVerificationToken,
  consumePasswordResetToken,
  createEmailVerificationToken,
  createPasswordResetToken,
  isPasswordResetTokenValid,
} from "@/application/infra/db/tokenRepo";
import {
  createUser,
  findUserByEmail,
  findUserById,
  linkUserOAuth,
  markEmailVerified,
  type OAuthProvider,
  updateLastLogin,
  updatePassword,
  updateUserProfile,
} from "@/application/infra/db/userRepo";
import { supabaseServer } from "@/application/infra/storage/supabase";
import { sendTransactionalEmail } from "@/application/services/emailService";
import { siteConfig } from "@/config/site";
import { env } from "@/core/env";

const VERIFICATION_TTL_MINUTES = 60 * 24; // 24 hours
const RESET_TTL_MINUTES = 60; // 1 hour
const AVATAR_BUCKET = "avatars";
const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5MB

function ensurePasswordStrength(password: string) {
  if (password.length < 8) {
    throw new Error("Mật khẩu phải dài tối thiểu 8 ký tự");
  }
}

function ensureValidEmail(email: string) {
  const trimmed = email.trim();
  const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  if (!emailRegex.test(trimmed)) {
    throw new Error("Email không hợp lệ");
  }
  return trimmed.toLowerCase();
}

function ensureName(name: string) {
  if (!name || !name.trim()) {
    throw new Error("Vui lòng nhập họ và tên");
  }
  return name.trim();
}

export async function registerWithEmail(input: {
  email: string;
  password: string;
  passwordConfirm?: string;
  fullName: string;
  school?: string | null;
  dateOfBirth?: string | null;
  avatarUrl?: string | null;
}) {
  const email = ensureValidEmail(input.email);
  const fullName = ensureName(input.fullName);
  const existing = await findUserByEmail(email);
  if (existing) {
    throw new Error("Email đã được đăng ký");
  }
  if (
    input.passwordConfirm !== undefined &&
    input.password !== input.passwordConfirm
  ) {
    throw new Error("Mật khẩu nhập lại không khớp");
  }
  ensurePasswordStrength(input.password);
  const uploadedAvatar = input.avatarUrl
    ? await normalizeAvatarUpload(email, input.avatarUrl)
    : null;
  const passwordHash = await bcrypt.hash(input.password, 10);
  const allowlistEntry = await findAllowlistEntryByEmail(email);
  const allowlisted = Boolean(allowlistEntry);
  const user = await createUser({
    email,
    password_hash: passwordHash,
    full_name: fullName,
    school: input.school,
    date_of_birth: input.dateOfBirth,
    avatar_url: uploadedAvatar,
    role: allowlisted ? allowlistEntry?.role : "student",
    status: allowlisted ? "active" : "pending_verification",
    tier: allowlisted ? allowlistEntry?.tier : "free",
    email_verified_at: allowlisted ? new Date().toISOString() : null,
    profile_completed: true,
  });

  if (allowlisted && allowlistEntry?.tier === "paid") {
    await insertAllowlistUpgrade(user.id);
  }

  if (!allowlisted) {
    const rawToken = await createEmailVerificationToken(
      user.id,
      VERIFICATION_TTL_MINUTES,
    );
    const verifyLink = `${env.NEXT_PUBLIC_APP_URL}/auth/verify?token=${rawToken}`;
    await sendTransactionalEmail({
      to: [{ email: user.email, name: user.full_name }],
      subject: "Xác minh tài khoản BaiHoc",
      text: `Xin chào ${user.full_name},\n\nVui lòng xác minh email của bạn tại liên kết sau: ${verifyLink}\n\nCảm ơn,\nĐội ngũ ${siteConfig.name}`,
    });
  }

  return user;
}

export async function verifyEmailWithToken(rawToken: string) {
  const tokenRow = await consumeEmailVerificationToken(rawToken);
  if (!tokenRow) {
    throw new Error("Mã xác minh không hợp lệ hoặc đã hết hạn");
  }
  await markEmailVerified(tokenRow.user_id);
  return tokenRow.user_id;
}

export async function loginWithEmail(input: {
  email: string;
  password: string;
}) {
  const email = ensureValidEmail(input.email);
  const user = await findUserByEmail(email);
  if (!user || !user.password_hash) {
    throw new Error("Thông tin đăng nhập không đúng");
  }
  const valid = await bcrypt.compare(input.password, user.password_hash);
  if (!valid) {
    throw new Error("Thông tin đăng nhập không đúng");
  }
  enforceLoginStatus(user.status);
  await updateLastLogin(user.id);
  return user;
}

export async function requestPasswordReset(email: string) {
  const validEmail = ensureValidEmail(email);
  const user = await findUserByEmail(validEmail);
  if (!user) {
    return;
  }
  const rawToken = await createPasswordResetToken(user.id, RESET_TTL_MINUTES);
  const resetLink = `${env.NEXT_PUBLIC_APP_URL}/auth/reset?token=${rawToken}`;
  await sendTransactionalEmail({
    to: [{ email: user.email, name: user.full_name }],
    subject: "Đặt lại mật khẩu BaiHoc",
    text: `Xin chào ${user.full_name},\n\nĐặt lại mật khẩu tại: ${resetLink}\n\nNếu bạn không yêu cầu, vui lòng bỏ qua email này.`,
  });
}

export async function resetPasswordWithToken(
  rawToken: string,
  newPassword: string,
) {
  ensurePasswordStrength(newPassword);
  const tokenRow = await consumePasswordResetToken(rawToken);
  if (!tokenRow) {
    throw new Error("Mã đặt lại không hợp lệ hoặc đã hết hạn");
  }
  const passwordHash = await bcrypt.hash(newPassword, 10);
  await updatePassword(tokenRow.user_id, passwordHash);
}

export async function verifyResetToken(rawToken: string) {
  const tokenRow = await isPasswordResetTokenValid(rawToken);
  if (!tokenRow) {
    throw new Error("Mã đặt lại không hợp lệ hoặc đã hết hạn");
  }
  return tokenRow.user_id;
}

export async function googleRegister(input: {
  accessToken: string;
  school?: string | null;
  dateOfBirth?: string | null;
}) {
  const provider: OAuthProvider = "google";
  const userinfo = await getGoogleUserInfoFromAccessToken(input.accessToken);
  const email = ensureValidEmail(userinfo.email);
  const fullName = userinfo.name ? ensureName(userinfo.name) : email;
  const existing = await findUserByEmail(email);
  if (existing) {
    throw new Error("Email đã tồn tại, không thể đăng ký bằng Google.");
  }
  const allowlistEntry = await findAllowlistEntryByEmail(email);
  const avatarUpload = userinfo.picture
    ? await normalizeAvatarUpload(userinfo.sub, userinfo.picture)
    : null;

  const user = await createUser({
    email,
    password_hash: null,
    full_name: fullName,
    avatar_url: avatarUpload,
    school: input.school ?? null,
    date_of_birth: input.dateOfBirth ?? null,
    oauth_provider: provider,
    oauth_sub: userinfo.sub,
    role: allowlistEntry?.role ?? "student",
    tier: allowlistEntry?.tier ?? "free",
    status: "active",
    email_verified_at: new Date().toISOString(),
    profile_completed: false,
  });
  if (allowlistEntry?.tier === "paid") {
    await insertAllowlistUpgrade(user.id);
  }
  await updateLastLogin(user.id);
  return user;
}

export async function googleLogin(input: {
  accessToken: string;
  school?: string | null;
  dateOfBirth?: string | null;
}) {
  const provider: OAuthProvider = "google";
  const userinfo = await getGoogleUserInfoFromAccessToken(input.accessToken);
  const email = ensureValidEmail(userinfo.email);

  const byEmail = await findUserByEmail(email);
  if (!byEmail) {
    throw new Error("Email chưa được đăng ký. Vui lòng tạo tài khoản trước.");
  }
  if (byEmail.oauth_provider && byEmail.oauth_sub !== userinfo.sub) {
    throw new Error(
      "Email đã liên kết tài khoản khác. Vui lòng đăng nhập bằng email/mật khẩu.",
    );
  }

  const linked = byEmail.oauth_provider
    ? byEmail
    : await linkUserOAuth(byEmail.id, provider, userinfo.sub);
  enforceLoginStatus(linked?.status ?? byEmail.status);
  await updateLastLogin(byEmail.id);
  return linked ?? byEmail;
}

function enforceLoginStatus(status: string) {
  if (status === "pending_verification") {
    throw new Error("Email chưa được xác minh");
  }
  if (status === "deactivated") {
    throw new Error("Tài khoản đã bị vô hiệu hóa.");
  }
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
  const fullName = ensureName(input.fullName);
  const uploadedAvatar = input.avatarUrl?.startsWith("data:")
    ? await storeAvatar(userId, input.avatarUrl)
    : undefined;
  const updated = await updateUserProfile(userId, {
    full_name: fullName,
    school: input.school,
    date_of_birth: input.dateOfBirth,
    avatar_url: uploadedAvatar ?? input.avatarUrl ?? undefined,
    profile_completed: true,
  });
  if (!updated) {
    throw new Error("Không tìm thấy người dùng");
  }
  return updated;
}

export async function getProfilePrefill(userId: string) {
  const user = await findUserById(userId);
  if (!user) {
    throw new Error("Không tìm thấy người dùng");
  }
  return {
    fullName: user.full_name ?? "",
    school: user.school ?? "",
    dateOfBirth: user.date_of_birth ?? "",
    avatarUrl: user.avatar_url ?? "",
  };
}

async function storeAvatar(userId: string, dataUrl: string) {
  const match = /^data:(image\/[-+.\w]+);base64,(.+)$/i.exec(dataUrl);
  if (!match) {
    throw new Error("Dữ liệu ảnh không hợp lệ");
  }
  const mime = match[1];
  const base64 = match[2];
  if (estimateBase64Bytes(base64) > MAX_AVATAR_BYTES) {
    throw new Error("Ảnh đại diện quá lớn (tối đa 5MB)");
  }
  const buffer = Buffer.from(base64, "base64");
  if (buffer.byteLength > MAX_AVATAR_BYTES) {
    throw new Error("Ảnh đại diện quá lớn (tối đa 5MB)");
  }
  const ext = mime.split("/")[1] || "png";
  const path = `${userId}/${Date.now()}.${ext}`;
  const { error } = await supabaseServer.storage
    .from(AVATAR_BUCKET)
    .upload(path, buffer, {
      contentType: mime,
      upsert: true,
    });
  if (error) {
    throw new Error("Không thể lưu ảnh đại diện");
  }
  const { data } = supabaseServer.storage
    .from(AVATAR_BUCKET)
    .getPublicUrl(path);
  return data.publicUrl;
}

async function uploadAvatarFromUrl(userKey: string, url: string) {
  const safeUrl = ensureSafeRemoteImageUrl(url);
  const controller = new AbortController();
  const res = await fetch(safeUrl, { signal: controller.signal });
  if (!res.ok) {
    throw new Error("Không thể tải ảnh đại diện từ Google");
  }
  const mime = res.headers.get("content-type")?.split(";")[0] || "";
  if (!mime.startsWith("image/")) {
    throw new Error("Định dạng ảnh đại diện không hợp lệ");
  }
  const contentLength = Number(res.headers.get("content-length") ?? "0");
  if (contentLength && contentLength > MAX_AVATAR_BYTES) {
    controller.abort();
    throw new Error("Ảnh đại diện quá lớn (tối đa 5MB)");
  }
  const buffer = await readResponseWithLimit(res, controller, MAX_AVATAR_BYTES);
  const ext = sanitizeImageExtension(mime) ?? "jpg";
  const path = `${userKey}/${Date.now()}.${ext}`;
  const { error } = await supabaseServer.storage
    .from(AVATAR_BUCKET)
    .upload(path, buffer, {
      contentType: mime,
      upsert: true,
    });
  if (error) {
    throw new Error("Không thể lưu ảnh đại diện");
  }
  const { data } = supabaseServer.storage
    .from(AVATAR_BUCKET)
    .getPublicUrl(path);
  return data.publicUrl;
}

async function normalizeAvatarUpload(userKey: string, avatarUrl: string) {
  if (avatarUrl.startsWith("data:")) {
    return await storeAvatar(userKey, avatarUrl);
  }
  if (avatarUrl.startsWith("http")) {
    return await uploadAvatarFromUrl(userKey, avatarUrl);
  }
  return avatarUrl;
}

async function getGoogleUserInfoFromAccessToken(accessToken: string) {
  const aud = env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!aud) {
    throw new Error("Google client ID is not configured");
  }
  const tokenInfo = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(
      accessToken,
    )}`,
  );
  if (!tokenInfo.ok) {
    throw new Error("Google sign-in không hợp lệ");
  }
  const tokenPayload = (await tokenInfo.json()) as { aud?: string };
  if (!tokenPayload?.aud || tokenPayload.aud !== aud) {
    throw new Error("Google sign-in không hợp lệ");
  }

  const userInfo = await fetch(
    "https://www.googleapis.com/oauth2/v3/userinfo",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );
  if (!userInfo.ok) {
    throw new Error("Google sign-in không hợp lệ");
  }
  const userPayload = (await userInfo.json()) as {
    sub?: string;
    email?: string;
    name?: string;
    picture?: string;
  };
  if (!userPayload?.sub || !userPayload.email) {
    throw new Error("Google sign-in không hợp lệ");
  }
  return {
    sub: userPayload.sub,
    email: userPayload.email,
    name: userPayload.name,
    picture: userPayload.picture,
  };
}

function estimateBase64Bytes(base64: string) {
  const stripped = base64.trim();
  const padding = stripped.endsWith("==") ? 2 : stripped.endsWith("=") ? 1 : 0;
  return Math.floor((stripped.length * 3) / 4) - padding;
}

function sanitizeImageExtension(mime: string) {
  const ext = mime.split("/")[1]?.toLowerCase();
  if (!ext) return null;
  if (!/^[a-z0-9]+$/.test(ext)) return null;
  return ext;
}

function ensureSafeRemoteImageUrl(rawUrl: string) {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("Ảnh đại diện không hợp lệ");
  }
  if (parsed.protocol !== "https:") {
    throw new Error("Chỉ hỗ trợ ảnh đại diện qua HTTPS");
  }
  const hostname = parsed.hostname.toLowerCase();
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname === "127.0.0.1" ||
    hostname === "::1"
  ) {
    throw new Error("Ảnh đại diện không hợp lệ");
  }
  if (isPrivateIpV4(hostname)) {
    throw new Error("Ảnh đại diện không hợp lệ");
  }
  return parsed.toString();
}

function isPrivateIpV4(hostname: string) {
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) return false;
  const parts = hostname.split(".").map((s) => Number(s));
  if (parts.some((p) => !Number.isInteger(p) || p < 0 || p > 255)) return true;
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

async function readResponseWithLimit(
  res: Response,
  controller: AbortController,
  maxBytes: number,
) {
  const reader = res.body?.getReader();
  if (!reader) {
    throw new Error("Không thể tải ảnh đại diện");
  }
  const chunks: Buffer[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      controller.abort();
      throw new Error("Ảnh đại diện quá lớn (tối đa 5MB)");
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks, total);
}
