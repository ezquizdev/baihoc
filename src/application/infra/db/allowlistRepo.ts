import { query } from "@/application/infra/db/pool";

export type AllowlistRow = {
  email: string;
  added_by: string | null;
  created_at: string;
};

export async function listAllowlist(limit = 200, offset = 0) {
  const res = await query<AllowlistRow>(
    `SELECT * FROM course_student_allowlist
     ORDER BY created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset],
  );
  return res.rows;
}

export async function insertAllowlistEmail(email: string, addedBy?: string) {
  await query(
    `INSERT INTO course_student_allowlist (email, added_by)
     VALUES ($1, $2)
     ON CONFLICT (email) DO NOTHING`,
    [email.toLowerCase(), addedBy ?? null],
  );
}

export async function removeAllowlistEmail(email: string) {
  await query(`DELETE FROM course_student_allowlist WHERE email = $1`, [
    email.toLowerCase(),
  ]);
}

export async function isEmailAllowlisted(email: string) {
  const res = await query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM course_student_allowlist WHERE email = $1
     ) AS exists`,
    [email.toLowerCase()],
  );
  return Boolean(res.rows[0]?.exists);
}
