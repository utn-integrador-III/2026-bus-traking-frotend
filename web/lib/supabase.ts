import { createClient } from "@supabase/supabase-js";
import { env } from "./env";

let supabaseInstance: ReturnType<typeof createClient> | null = null;

export function getSupabaseClient() {
  if (supabaseInstance) return supabaseInstance;

  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    if (typeof window === "undefined" || process.env.SKIP_ENV_VALIDATION === "true") {
      return null;
    }
    throw new Error("Missing Supabase environment variables");
  }

  supabaseInstance = createClient(url, anonKey);
  return supabaseInstance;
}
