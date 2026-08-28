import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  class MockApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  }
  class MockApiUnreachableError extends Error {}
  return {
    apiFetch: vi.fn(),
    writeSession: vi.fn(),
    clearSession: vi.fn(),
    MockApiError,
    MockApiUnreachableError,
  };
});

vi.mock("@/lib/api/client", () => ({
  apiFetch: mocks.apiFetch,
  ApiError: mocks.MockApiError,
  ApiUnreachableError: mocks.MockApiUnreachableError,
}));
vi.mock("@/lib/auth/session", () => ({
  writeSession: mocks.writeSession,
  clearSession: mocks.clearSession,
}));

import { DELETE, POST } from "@/app/api/session/route";

describe("API de sesión", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rechaza credenciales con formato inválido", async () => {
    const response = await POST(new Request("http://localhost/api/session", {
      method: "POST", body: JSON.stringify({ email: "invalid", password: "" }),
    }));

    expect(response.status).toBe(400);
    expect(mocks.apiFetch).not.toHaveBeenCalled();
  });

  it("crea una sesión para un administrador", async () => {
    mocks.apiFetch.mockResolvedValueOnce({
      access_token: "jwt", expires_in: 3600,
      user: { id: "admin-1", email: "admin@example.com", role: "Admin", name: "Admin" },
    });

    const response = await POST(new Request("http://localhost/api/session", {
      method: "POST", body: JSON.stringify({ email: "admin@example.com", password: "secret" }),
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ user: expect.objectContaining({ role: "Admin" }) });
    expect(mocks.writeSession).toHaveBeenCalledWith("jwt", 3600);
  });

  it("no autoriza usuarios que no sean administradores", async () => {
    mocks.apiFetch.mockResolvedValueOnce({
      access_token: "jwt", expires_in: 3600,
      user: { id: "passenger-1", email: "p@example.com", role: "Passenger", name: "P" },
    });

    const response = await POST(new Request("http://localhost/api/session", {
      method: "POST", body: JSON.stringify({ email: "p@example.com", password: "secret" }),
    }));

    expect(response.status).toBe(403);
    expect(mocks.writeSession).not.toHaveBeenCalled();
  });

  it("mapea una API inaccesible y borra la sesión", async () => {
    mocks.apiFetch.mockRejectedValueOnce(new mocks.MockApiUnreachableError());
    const failed = await POST(new Request("http://localhost/api/session", {
      method: "POST", body: JSON.stringify({ email: "admin@example.com", password: "secret" }),
    }));
    expect(failed.status).toBe(503);

    const deleted = await DELETE();
    expect(deleted.status).toBe(200);
    expect(mocks.clearSession).toHaveBeenCalledTimes(1);
  });
});
