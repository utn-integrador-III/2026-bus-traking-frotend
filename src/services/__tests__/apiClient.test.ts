import {
  apiRequest,
  getPassengerHomeTrips,
  getPassengerHomeTripsPreview,
  getPassengerTripTrackingData,
  getTripEtaMinutes,
} from "../apiClient";

function response(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: jest.fn().mockResolvedValue(body === null ? "" : JSON.stringify(body)),
  } as unknown as Response;
}

function rawResponse(status: number, body: string): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: jest.fn().mockResolvedValue(body),
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

  it("handles empty and non-JSON response bodies", async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(rawResponse(204, ""))
      .mockResolvedValueOnce(rawResponse(500, "Plain server error"));

    await expect(apiRequest("empty")).resolves.toBeNull();
    await expect(apiRequest("plain-error", { method: "POST" })).rejects.toEqual(
      expect.objectContaining({ status: 500, message: "Plain server error" }),
    );
  });

  it.each([
    [{ error: { message: "nested", code: "NESTED" } }, "nested", "NESTED"],
    [{ error: {}, message: "outer", code: "OUTER" }, "outer", "OUTER"],
    [{ message: "simple", code: "SIMPLE" }, "simple", "SIMPLE"],
    [null, "No se pudo completar", undefined],
  ])("normalizes supported API error envelopes", async (body, message, code) => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(response(400, body));
    await expect(apiRequest("failure", { method: "POST" })).rejects.toEqual(
      expect.objectContaining({ message: expect.stringContaining(message), code }),
    );
  });

  it("distinguishes request timeouts from network failures", async () => {
    const timeout = Object.assign(new Error("timeout"), { name: "AbortError" });
    (global.fetch as jest.Mock)
      .mockRejectedValueOnce(timeout)
      .mockRejectedValueOnce(new Error("offline"));

    await expect(apiRequest("timeout", { method: "POST" })).rejects.toEqual(
      expect.objectContaining({ code: "TIMEOUT" }),
    );
    await expect(apiRequest("offline", { method: "POST" })).rejects.toEqual(
      expect.objectContaining({ code: "NETWORK_ERROR" }),
    );
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

  it("maps every trip status and missing route fallbacks", async () => {
    const routes = [
      { id: "route-one", name: "R1 Centro", origin: "A", destination: "B", status: "Active" },
      { id: "abcd-route", name: null, origin: "", destination: "", status: "Active" },
    ];
    const trips = [
      { id: "delay-trip", route_id: "route-one", bus_id: "bus", departure_time: "d", status: "Delayed" },
      { id: "scheduled-trip", route_id: "abcd-route", bus_id: "bus", departure_time: "d", status: "Scheduled" },
      { id: "pending-trip", route_id: "missing", bus_id: "bus", departure_time: "d", status: "Pending" },
      { id: "stopped-trip", route_id: "missing", bus_id: "bus", departure_time: "d", status: "Stopped" },
      { id: "other-trip", route_id: "missing", bus_id: "bus", departure_time: "d", status: "Completed" },
    ];
    jest.spyOn(global, "fetch")
      .mockResolvedValueOnce(response(200, routes))
      .mockResolvedValueOnce(response(200, trips));

    const cards = await getPassengerHomeTrips("jwt");
    expect(cards.map((card) => card.badgeText)).toEqual([
      "Demora", "Programado", "Programado", "Detenido", "Completed",
    ]);
    expect(cards.map((card) => card.etaText)).toEqual([
      "+10 min", expect.stringMatching(/Pr/), expect.stringMatching(/Pr/), "Ver", "Ver",
    ]);
    expect(cards[1]).toEqual(expect.objectContaining({ code: "ABCD", name: "Ruta disponible" }));
    expect(cards[2]).toEqual(expect.objectContaining({ code: "PEND", name: "Viaje disponible", origin: "Origen" }));
  });

  it("validates trip and route associations", async () => {
    jest.spyOn(global, "fetch")
      .mockResolvedValueOnce(response(200, []))
      .mockResolvedValueOnce(response(200, []));
    await expect(getPassengerTripTrackingData("missing")).rejects.toEqual(
      expect.objectContaining({ code: "TRIP_NOT_FOUND" }),
    );

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(response(200, []))
      .mockResolvedValueOnce(response(200, [{ id: "trip", route_id: "missing", bus_id: "bus", departure_time: "d", status: "Scheduled" }]));
    await expect(getPassengerTripTrackingData("trip")).rejects.toEqual(
      expect.objectContaining({ code: "ROUTE_NOT_FOUND" }),
    );
  });

  it.each([
    [{ type: "LineString", coordinates: [[-84, 9]] }, "Delayed", 10],
    ["not-json", "Scheduled", 4],
  ])("normalizes route geometry variants", async (geometry, status, eta) => {
    jest.spyOn(global, "fetch")
      .mockResolvedValueOnce(response(200, [{ id: "route", name: "NoCode", origin: "A", destination: "B", geometry_geojson: geometry }]))
      .mockResolvedValueOnce(response(200, [{ id: "trip", route_id: "route", bus_id: "bus-123456", departure_time: "d", status }]));
    const result = await getPassengerTripTrackingData("trip");
    expect(result.geojson.type).toBe("Feature");
    expect(result.estimatedArrivalMinutes).toBe(eta);
  });

  it("adapts preview routes with object, string and missing geometry", async () => {
    const feature = { type: "Feature", geometry: { type: "LineString", coordinates: [[-84, 9]] } };
    jest.spyOn(global, "fetch").mockResolvedValueOnce(response(200, [
      { id: "t1", route_id: "r1", bus_id: "b", departure_time: "d", status: "In_Progress", route: { id: "r1", name: "R1", origin: "A", destination: "B", geometry_geojson: feature } },
      { id: "t2", route_id: "r2", bus_id: "b", departure_time: "d", status: "Scheduled", route: { id: "r2", name: "R2", origin: "C", destination: "D", geometry_geojson: JSON.stringify(feature) } },
      { id: "trip-missing", route_id: "missing", bus_id: "b", departure_time: "d", status: "Stopped", route: null },
    ]));
    const previews = await getPassengerHomeTripsPreview("jwt");
    expect(previews[0].geojson).toBe(JSON.stringify(feature));
    expect(previews[1].geojson).toBe(JSON.stringify(feature));
    expect(previews[2]).toEqual(expect.objectContaining({ code: "TRIP", geojson: null, routeName: "Ruta disponible" }));
  });

  it.each([
    [undefined, null],
    ["unknown", null],
    ["90s", 2],
    ["0s", 1],
  ])("parses Google route durations", async (duration, expected) => {
    jest.spyOn(global, "fetch").mockResolvedValueOnce(response(200, { duration }));
    await expect(getTripEtaMinutes({ latitude: 1, longitude: 1 }, { latitude: 2, longitude: 2 })).resolves.toBe(expected);
  });
});
