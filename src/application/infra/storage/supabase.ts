import { createClient } from "@supabase/supabase-js";
import { env } from "@/core/env";

if (typeof window !== "undefined") {
  throw new Error("supabase server client can only be imported on the server.");
}

export const supabaseServer = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);
