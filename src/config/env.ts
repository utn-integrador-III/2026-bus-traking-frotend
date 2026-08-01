function readPublicEnv(key: string): string | undefined {
  return (globalThis as any)?.process?.env?.[key];
}

export const env = {
  apiBaseUrl:
    readPublicEnv("EXPO_PUBLIC_API_URL") || "http://localhost:8000",
};