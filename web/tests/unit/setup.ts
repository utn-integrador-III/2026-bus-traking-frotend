import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:8000";
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-key";

vi.mock("server-only", () => ({}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
