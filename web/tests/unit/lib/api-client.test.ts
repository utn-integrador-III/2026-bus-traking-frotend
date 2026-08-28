import { describe, expect, it, vi } from "vitest";
import { ApiUnreachableError, apiFetch } from "@/lib/api/client";

function response(status: number, body?: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response;
}

describe("apiFetch", () => {
  it("normaliza la ruta y envía autenticación y JSON", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(200, { id: "route-1" })));

    await expect(apiFetch("/admin/routes", { method: "POST", token: "jwt", body: { name: "Central" } })).resolves.toEqual({ id: "route-1" });
    expect(fetch).toHaveBeenCalledWith("http://localhost:8000/api/admin/routes", expect.objectContaining({
      method: "POST",
      headers: { Authorization: "Bearer jwt", "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Central" }),
      cache: "no-store",
    }));
  });

  it("devuelve undefined para respuestas sin contenido", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(204)));
    await expect(apiFetch("/admin/routes/one", { method: "DELETE" })).resolves.toBeUndefined();
  });

  it("preserva el código y mensaje de un error HTTP", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(422, { error: { code: "INVALID", message: "Entrada inválida" } })));
    await expect(apiFetch("/admin/routes")).rejects.toMatchObject({
      name: "ApiError", status: 422, code: "INVALID", message: "Entrada inválida",
    });
  });

  it("convierte fallos de red a ApiUnreachableError", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    await expect(apiFetch("/admin/routes")).rejects.toBeInstanceOf(ApiUnreachableError);
  });
});
