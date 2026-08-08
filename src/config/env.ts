export const env = {
  apiBaseUrl:
    process.env.EXPO_PUBLIC_API_BASE_URL || process.env.EXPO_PUBLIC_API_URL,

  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,

  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
};
