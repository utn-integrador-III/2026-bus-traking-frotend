import { apiRequest, getPassengerHomeTrips, getTripEtaMinutes } from "../apiClient";

function response(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: jest.fn().mockResolvedValue(body === null ? "" : JSON.stringify(body)),
  } as unknown as Response;
}

describe("apiRequest", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.spyOn(global, "fetch");
  });

  it("normaliza la URL y envía JSON, token y método", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(response(200, { ok: true }));

    await expect(apiRequest("/api/example", { method: "POST", body: { value: 1 }, token: "jwt" })).resolves.toEqual({ ok: true });
    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:8000/api/example",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ value: 1 }),
        headers: expect.objectContaining({ Authorization: "Bearer jwt", "Content-Type": "application/json" }),
      }),
    );
  });

  it("convierte la respuesta de error de la API", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(response(422, { error: { code: "INVALID", message: "Dato inválido", details: { field: "name" } } }));

    await expect(apiRequest("items")).rejects.toEqual(expect.objectContaining({
      name: "ApiClientError", status: 422, code: "INVALID", message: "Dato inválido",
    }));
  });

  it("rechaza arreglos inválidos cuando se solicitan", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(response(200, { id: "one" }));

    await expect(apiRequest("items", { expectArray: true })).rejects.toEqual(expect.objectContaining({
      status: 200, code: "INVALID_RESPONSE",
    }));
  });

  it("reintenta una lectura tras un fallo de red", async () => {
    jest.useFakeTimers();
    (global.fetch as jest.Mock)
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(response(200, []));

    const result = apiRequest("items", { expectArray: true });
    await jest.advanceTimersByTimeAsync(800);
    await expect(result).resolves.toEqual([]);
    expect(global.fetch).toHaveBeenCalledTimes(2);
    jest.useRealTimers();
  });
});

describe("adaptadores de viajes", () => {
  beforeEach(() => jest.restoreAllMocks());

  it("construye tarjetas con ruta y estado", async () => {
    jest.spyOn(global, "fetch")
      .mockResolvedValueOnce(response(200, [{ id: "route-1", name: "A1 Centro", origin: "A", destination: "B", status: "Active" }]))
      .mockResolvedValueOnce(response(200, [{ id: "trip-1", route_id: "route-1", bus_id: "bus", departure_time: "2026-01-01", status: "In_Progress" }]));

    await expect(getPassengerHomeTrips()).resolves.toEqual([expect.objectContaining({ code: "A1", name: "A → B", badgeText: "En ruta", etaText: "En vivo" })]);
  });

  it("devuelve null si no se puede calcular ETA", async () => {
    jest.spyOn(global, "fetch").mockRejectedValueOnce(new Error("offline"));
    jest.useFakeTimers();
    const result = getTripEtaMinutes({ latitude: 1, longitude: 1 }, { latitude: 2, longitude: 2 });
    await jest.advanceTimersByTimeAsync(800);
    await expect(result).resolves.toBeNull();
    jest.useRealTimers();
  });
});
