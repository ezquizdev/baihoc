import bcrypt from "bcryptjs";
import { insertAllowlistEmail } from "@/application/infra/db/allowlistRepo";
import { insertAuditLog } from "@/application/infra/db/auditRepo";
import { insertAllowlistUpgrade } from "@/application/infra/db/membershipRepo";
import {
  adminUpdateUser,
  createUser,
  findUserByEmail,
  markEmailVerified,
  updatePassword,
  updateUserProfile,
} from "@/application/infra/db/userRepo";
import { normalizeEmail } from "@/application/utils/email";
import { env } from "@/core/env";

const seedPromise = (async () => {
  const seedEmail = env.ADMIN_SEED_EMAIL?.trim();
  const seedPassword = env.ADMIN_SEED_PASSWORD;
  if (!seedEmail || !seedPassword) return;

  const email = normalizeEmail(seedEmail);
  const existing = await findUserByEmail(email);
  const passwordHash = await bcrypt.hash(seedPassword, 10);
  const nowIso = new Date().toISOString();

  if (!existing) {
    const user = await createUser({
      email,
      password_hash: passwordHash,
      full_name: env.ADMIN_SEED_NAME?.trim() || "BaiHoc Admin",
      role: "staff",
      tier: "paid",
      status: "active",
      email_verified_at: nowIso,
      profile_completed: true,
    });
    // Seed allowlist entry for parity and history
    await insertAllowlistEmail(email, null);
    await insertAllowlistUpgrade(user.id);
    await insertAuditLog({
      actorUserId: null,
      action: "seed_admin_created",
      targetType: "user",
      targetId: user.id,
      metadata: { email },
    });
    return;
  }

  // Ensure baseline fields; keep idempotent
  const needsPasswordUpdate =
    !existing.password_hash ||
    !(await bcrypt.compare(seedPassword, existing.password_hash));
  if (needsPasswordUpdate) {
    await updatePassword(existing.id, passwordHash);
  }
  const needsRoleTierStatus =
    existing.role !== "staff" ||
    existing.tier !== "paid" ||
    existing.status !== "active" ||
    !existing.email_verified_at ||
    !existing.profile_completed;
  if (needsRoleTierStatus) {
    await adminUpdateUser(existing.id, {
      role: "staff",
      tier: "paid",
      status: "active",
    });
    if (!existing.profile_completed) {
      await updateUserProfile(existing.id, { profile_completed: true });
    }
    if (!existing.email_verified_at) {
      await markEmailVerified(existing.id);
    }
    await insertAuditLog({
      actorUserId: null,
      action: "seed_admin_hardened",
      targetType: "user",
      targetId: existing.id,
      metadata: { email },
    });
  }
})();

export async function ensureSeedAdmin() {
  await seedPromise;
}
