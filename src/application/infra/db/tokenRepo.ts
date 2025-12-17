import crypto from "node:crypto";
import { query } from "@/application/infra/db/pool";

export type VerificationTokenRow = {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
};

export type ResetTokenRow = VerificationTokenRow;

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function generateRawToken() {
  return crypto.randomBytes(32).toString("hex");
}

export async function createEmailVerificationToken(
  userId: string,
  ttlMinutes: number,
) {
  const rawToken = generateRawToken();
  const hashed = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
  await query(
    `INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, hashed, expiresAt.toISOString()],
  );
  return rawToken;
}

export async function consumeEmailVerificationToken(rawToken: string) {
  const hashed = hashToken(rawToken);
  const res = await query<VerificationTokenRow>(
    `UPDATE email_verification_tokens
     SET used_at = now()
     WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()
     RETURNING *`,
    [hashed],
  );
  return res.rows[0] ?? null;
}

export async function createPasswordResetToken(
  userId: string,
  ttlMinutes: number,
) {
  const rawToken = generateRawToken();
  const hashed = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
  await query(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, hashed, expiresAt.toISOString()],
  );
  return rawToken;
}

export async function consumePasswordResetToken(rawToken: string) {
  const hashed = hashToken(rawToken);
  const res = await query<ResetTokenRow>(
    `UPDATE password_reset_tokens
     SET used_at = now()
     WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()
     RETURNING *`,
    [hashed],
  );
  return res.rows[0] ?? null;
}
