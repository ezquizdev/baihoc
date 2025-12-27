import { z } from "zod";

if (typeof window !== "undefined") {
  throw new Error("env can only be imported on the server.");
}

const optionalNonEmptyString = z
  .string()
  .transform((value) => value.trim() || undefined)
  .optional();

const serverSchema = z.object({
  DATABASE_URL: z.string().url(),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SESSION_SECRET: z.string().min(32),
  BREVO_API_KEY: z.string().min(1),
  BREVO_SENDER_EMAIL: z.string().email(),
  BREVO_SENDER_NAME: z.string().min(1),
  GOOGLE_CLIENT_ID: optionalNonEmptyString,
  GOOGLE_CLIENT_SECRET: optionalNonEmptyString,
  LLM_API_KEY: optionalNonEmptyString,
});

const publicSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_LOG_LEVEL: z
    .enum(["debug", "info", "warn", "error"])
    .default("info"),
  NEXT_PUBLIC_GOOGLE_CLIENT_ID: optionalNonEmptyString,
});

const mergedSchema = serverSchema.merge(publicSchema);

export type Env = z.infer<typeof mergedSchema>;

function loadEnv(schema: typeof mergedSchema): Env {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Invalid environment variables: ${parsed.error.message}`);
  }
  return parsed.data;
}

export const env = loadEnv(mergedSchema);
