import { query } from "@/application/infra/db/pool";

export type UserRole = "student" | "staff";
export type UserTier = "free" | "paid";
export type UserStatus =
  | "pending_verification"
  | "active"
  | "deactivated";
export type OAuthProvider = "google";

export type UserRow = {
  id: string;
  email: string;
  password_hash: string | null;
  full_name: string;
  school: string | null;
  date_of_birth: string | null;
  avatar_url: string | null;
  role: UserRole;
  tier: UserTier;
  status: UserStatus;
  email_verified_at: string | null;
  oauth_provider: OAuthProvider | null;
  oauth_sub: string | null;
  profile_completed: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
};

export async function findUserByEmail(email: string) {
  const res = await query<UserRow>(
    `SELECT * FROM users WHERE email = $1 LIMIT 1`,
    [email],
  );
  return res.rows[0] ?? null;
}

export async function findUserByOAuth(provider: OAuthProvider, sub: string) {
  const res = await query<UserRow>(
    `SELECT * FROM users WHERE oauth_provider = $1 AND oauth_sub = $2 LIMIT 1`,
    [provider, sub],
  );
  return res.rows[0] ?? null;
}

export async function findUserById(id: string) {
  const res = await query<UserRow>(`SELECT * FROM users WHERE id = $1`, [id]);
  return res.rows[0] ?? null;
}

export type CreateUserInput = {
  email: string;
  password_hash: string | null;
  full_name: string;
  school?: string | null;
  date_of_birth?: string | null;
  avatar_url?: string | null;
  role?: UserRole;
  tier?: UserTier;
  status?: UserStatus;
  email_verified_at?: string | null;
  oauth_provider?: OAuthProvider | null;
  oauth_sub?: string | null;
  profile_completed?: boolean;
};

export async function createUser(input: CreateUserInput) {
  const res = await query<UserRow>(
    `INSERT INTO users (
      email, password_hash, full_name, school, date_of_birth, avatar_url,
      role, tier, status, email_verified_at, oauth_provider, oauth_sub, profile_completed
    ) VALUES (
      $1, $2, $3, $4, $5, $6,
      COALESCE($7::user_role, 'student'::user_role),
      COALESCE($8::user_tier, 'free'::user_tier),
      COALESCE($9::user_status, 'pending_verification'::user_status),
      $10,
      $11::oauth_provider,
      $12,
      COALESCE($13, false)
    )
    RETURNING *`,
    [
      input.email,
      input.password_hash,
      input.full_name,
      input.school ?? null,
      input.date_of_birth ?? null,
      input.avatar_url ?? null,
      input.role ?? "student",
      input.tier ?? "free",
      input.status ?? "pending_verification",
      input.email_verified_at ?? null,
      input.oauth_provider ?? null,
      input.oauth_sub ?? null,
      input.profile_completed ?? false,
    ],
  );
  return res.rows[0];
}

export async function markEmailVerified(userId: string) {
  await query(
    `UPDATE users SET status = 'active', email_verified_at = now(), updated_at = now() WHERE id = $1`,
    [userId],
  );
}

export async function updatePassword(userId: string, password_hash: string) {
  await query(
    `UPDATE users SET password_hash = $2, updated_at = now() WHERE id = $1`,
    [userId, password_hash],
  );
}

export async function updateLastLogin(userId: string) {
  await query(`UPDATE users SET last_login_at = now() WHERE id = $1`, [userId]);
}

export type ProfileUpdateInput = {
  full_name?: string;
  school?: string | null;
  date_of_birth?: string | null;
  avatar_url?: string | null;
  profile_completed?: boolean;
};

export async function updateUserProfile(
  userId: string,
  input: ProfileUpdateInput,
) {
  const res = await query<UserRow>(
    `UPDATE users
     SET full_name = COALESCE($2, full_name),
         school = COALESCE($3, school),
         date_of_birth = COALESCE($4, date_of_birth),
         avatar_url = COALESCE($5, avatar_url),
         profile_completed = COALESCE($6, profile_completed),
         updated_at = now()
     WHERE id = $1
     RETURNING *`,
    [
      userId,
      input.full_name ?? null,
      input.school ?? null,
      input.date_of_birth ?? null,
      input.avatar_url ?? null,
      input.profile_completed ?? null,
    ],
  );
  return res.rows[0] ?? null;
}

export async function linkUserOAuth(
  userId: string,
  provider: OAuthProvider,
  sub: string,
) {
  const res = await query<UserRow>(
    `UPDATE users
     SET oauth_provider = $2,
         oauth_sub = $3,
         updated_at = now()
     WHERE id = $1
     RETURNING *`,
    [userId, provider, sub],
  );
  return res.rows[0] ?? null;
}
