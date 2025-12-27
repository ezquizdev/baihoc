import { controllerAdminAllowlistList } from "@/application/controllers/userAdminController";
import { requireAuthenticatedPage } from "@/application/infra/auth/guards";
import { StaffSettingsScreen } from "@/components/staff-settings/staff-settings-screen";
import { env } from "@/core/env";

export default async function StaffSettingsPage() {
  const session = await requireAuthenticatedPage({
    next: "/staff/settings",
    role: "staff",
  });

  const allowlist = await controllerAdminAllowlistList({
    limit: 50,
    offset: 0,
  });

  const googleServerConfigured = Boolean(
    env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET,
  );
  const googlePublicConfigured = Boolean(env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);

  return (
    <StaffSettingsScreen
      session={session}
      status={{
        appUrl: env.NEXT_PUBLIC_APP_URL,
        logLevel: env.NEXT_PUBLIC_LOG_LEVEL,
        emailSender: {
          name: env.BREVO_SENDER_NAME,
          email: env.BREVO_SENDER_EMAIL,
        },
        googleOAuth: {
          serverConfigured: googleServerConfigured,
          publicConfigured: googlePublicConfigured,
        },
        llmConfigured: Boolean(env.LLM_API_KEY),
        avatars: { bucket: "avatars", maxSizeMb: 5 },
      }}
      initialAllowlist={allowlist.items}
      initialAllowlistTotal={allowlist.total}
    />
  );
}
