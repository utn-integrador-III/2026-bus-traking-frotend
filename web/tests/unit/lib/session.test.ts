import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cookies: vi.fn(), fetch: vi.fn(), get: vi.fn(), set: vi.fn(), del: vi.fn(),
}));
vi.mock("next/headers", () => ({ cookies: mocks.cookies }));
vi.mock("@/lib/api/client", () => ({ apiFetch: mocks.fetch }));

import { clearSession, readSession, SESSION_COOKIE, writeSession } from "@/lib/auth/session";

describe("server session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.cookies.mockResolvedValue({ get: mocks.get, set: mocks.set, delete: mocks.del });
  });

  it("returns null without a cookie or after an API failure", async () => {
    mocks.get.mockReturnValueOnce(undefined);
    await expect(readSession()).resolves.toBeNull();
    mocks.get.mockReturnValueOnce({ value: "bad" });
    mocks.fetch.mockRejectedValueOnce(new Error("expired"));
    await expect(readSession()).resolves.toBeNull();
  });

  it("builds a session from the authenticated user", async () => {
    mocks.get.mockReturnValue({ value: "jwt" });
    mocks.fetch.mockResolvedValue({ user_id: "u1", email: "a@test.com", role: "Admin" });
    await expect(readSession()).resolves.toEqual({
      access_token: "jwt",
      user: { id: "u1", email: "a@test.com", role: "Admin", name: null },
    });
    expect(mocks.fetch).toHaveBeenCalledWith("/auth/session", { token: "jwt" });
  });

  it("writes secure cookie options and clears the cookie", async () => {
    await writeSession("jwt", 3600);
    expect(mocks.set).toHaveBeenCalledWith(SESSION_COOKIE, "jwt", expect.objectContaining({
      httpOnly: true, sameSite: "lax", path: "/", maxAge: 3600,
    }));
    await clearSession();
    expect(mocks.del).toHaveBeenCalledWith(SESSION_COOKIE);
  });
});
