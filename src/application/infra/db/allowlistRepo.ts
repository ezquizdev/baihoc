import type { PoolClient } from "pg";
import { pool } from "@/application/infra/db/pool";
import type { UserRole, UserTier } from "@/application/infra/db/userRepo";

export type AllowlistRow = {
  email: string;
  role: UserRole;
  tier: UserTier;
  added_by: string | null;
  created_at: string;
};

export async function listAllowlist(
  limit = 200,
  offset = 0,
  client?: PoolClient,
) {
  const executor = client ?? pool;
  const res = await executor.query<AllowlistRow>(
    `SELECT email, role, tier, added_by, created_at
     FROM course_student_allowlist
     ORDER BY created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset],
  );
  return res.rows;
}

export async function findAllowlistEntryByEmail(
  email: string,
  client?: PoolClient,
) {
  const executor = client ?? pool;
  const res = await executor.query<AllowlistRow>(
    `SELECT email, role, tier, added_by, created_at
     FROM course_student_allowlist
     WHERE email = $1
     LIMIT 1`,
    [email.toLowerCase()],
  );
  return res.rows[0] ?? null;
}

export async function insertAllowlistEmail(
  input: {
    email: string;
    role?: UserRole;
    tier?: UserTier;
    addedBy?: string | null;
  },
  client?: PoolClient,
) {
  const executor = client ?? pool;
  await executor.query(
    `INSERT INTO course_student_allowlist (email, role, tier, added_by)
     VALUES (
       $1,
       COALESCE($2::user_role, 'student'::user_role),
       COALESCE($3::user_tier, 'paid'::user_tier),
       $4
     )
     ON CONFLICT (email)
     DO UPDATE SET
       role = EXCLUDED.role,
       tier = EXCLUDED.tier,
       added_by = EXCLUDED.added_by`,
    [
      input.email.toLowerCase(),
      input.role ?? null,
      input.tier ?? null,
      input.addedBy ?? null,
    ],
  );
}

export async function removeAllowlistEmail(email: string, client?: PoolClient) {
  const executor = client ?? pool;
  await executor.query(
    `DELETE FROM course_student_allowlist WHERE email = $1`,
    [email.toLowerCase()],
  );
}
