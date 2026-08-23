import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/cookie";
import { POST } from "@/app/api/routes/snap/route";

function request(body: unknown, authenticated = true) {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (authenticated) headers.set("Cookie", `${SESSION_COOKIE}=access-token`);

  return new NextRequest("http://localhost/api/routes/snap", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

describe("API para ajustar rutas a calles", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("exige una sesión administrativa", async () => {
    const response = await POST(request({ coordinates: [[-84, 10], [-84.1, 10.1]] }, false));

    expect(response.status).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("valida cantidad, formato y rango de coordenadas", async () => {
    for (const coordinates of [
      [[-84, 10]],
      [[-181, 10], [-84, 10]],
      Array.from({ length: 26 }, (_, index) => [-84, 9 + index / 100]),
    ]) {
      const response = await POST(request({ coordinates }));
      expect(response.status).toBe(400);
    }

    expect(fetch).not.toHaveBeenCalled();
  });

  it("calcula y une cada tramo del recorrido", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(JSON.stringify({
        encoded_polyline: "_p~iF~ps|U_ulLnnqC",
      })))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        encoded_polyline: "_flwFn`faV_mqNvxq`@",
      })));

    const response = await POST(request({
      coordinates: [[-120.2, 38.5], [-120.95, 40.7], [-126.453, 43.252]],
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      geometry: {
        type: "LineString",
        coordinates: [[-120.2, 38.5], [-120.95, 40.7], [-126.453, 43.252]],
      },
    });
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch).toHaveBeenNthCalledWith(
      1,
      "http://localhost:8000/api/google/routes/compute",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer access-token" }),
      }),
    );
  });

  it("propaga errores de la API y mapea fallos de red", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(
      JSON.stringify({ error: { message: "Ruta no encontrada" } }),
      { status: 422 },
    ));
    const rejected = await POST(request({ coordinates: [[-84, 10], [-84.1, 10.1]] }));
    expect(rejected.status).toBe(422);
    expect(await rejected.json()).toEqual({ message: "Ruta no encontrada" });

    vi.mocked(fetch).mockRejectedValueOnce(new Error("offline"));
    const unavailable = await POST(request({ coordinates: [[-84, 10], [-84.1, 10.1]] }));
    expect(unavailable.status).toBe(502);
  });
});
