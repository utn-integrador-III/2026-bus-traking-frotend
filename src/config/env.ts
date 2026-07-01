function readPublicEnv(key: string): string | undefined {
  return (globalThis as any)?.process?.env?.[key];
}

export const env = {
  apiBaseUrl:
    readPublicEnv("EXPO_PUBLIC_API_BASE_URL") || "http://localhost:8000/api",

  supabaseUrl: readPublicEnv("EXPO_PUBLIC_SUPABASE_URL") || "",

  supabaseAnonKey: readPublicEnv("EXPO_PUBLIC_SUPABASE_ANON_KEY") || "",
};