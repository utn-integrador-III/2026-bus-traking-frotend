import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  class MockApiError extends Error {
    isAuthError: boolean;
    constructor(message: string, isAuthError = false) {
      super(message);
      this.isAuthError = isAuthError;
    }
  }
  class MockApiUnreachableError extends Error {}
  return { fetch: vi.fn(), session: vi.fn(), MockApiError, MockApiUnreachableError };
});

vi.mock("@/lib/api/client", () => ({
  apiFetch: mocks.fetch,
  ApiError: mocks.MockApiError,
  ApiUnreachableError: mocks.MockApiUnreachableError,
}));
vi.mock("@/lib/auth/session", () => ({ readSession: mocks.session }));

import * as admin from "@/lib/api/admin";

describe("admin API adapters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.session.mockResolvedValue({ access_token: "jwt", user: { role: "Admin" } });
    mocks.fetch.mockResolvedValue({ id: "ok" });
  });

  it("returns an auth result without a session", async () => {
    mocks.session.mockResolvedValueOnce(null);
    await expect(admin.getRoutes()).resolves.toMatchObject({ ok: false, kind: "auth" });
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("maps unreachable and API failures", async () => {
    mocks.fetch.mockRejectedValueOnce(new mocks.MockApiUnreachableError());
    await expect(admin.getDrivers()).resolves.toMatchObject({ ok: false, kind: "unreachable" });
    mocks.fetch.mockRejectedValueOnce(new mocks.MockApiError("expired", true));
    await expect(admin.getTrips()).resolves.toEqual({ ok: false, kind: "auth", message: "expired" });
    mocks.fetch.mockRejectedValueOnce(new mocks.MockApiError("bad input"));
    await expect(admin.getRoutes()).resolves.toEqual({ ok: false, kind: "error", message: "bad input" });
    mocks.fetch.mockRejectedValueOnce(new TypeError("unexpected"));
    await expect(admin.getRoutes()).rejects.toThrow("unexpected");
  });

  it("forwards every admin operation with token, body and encoded query", async () => {
    const route = { name: "R", origin: "A", destination: "B", geometry_geojson: { type: "Feature" } } as never;
    const stop = { route_id: "r", name: "S", latitude: 1, longitude: 2, stop_order: 1 } as never;
    const trip = { route_id: "r", bus_id: "b", driver_id: "d", departure_time: "now" } as never;
    const calls = [
      admin.getRoutes(), admin.getDrivers(), admin.getTrips(),
      admin.deactivateRoute("r/1"), admin.reactivateRoute("r1"), admin.updateRoute("r1", route),
      admin.deactivateDriver("d1"), admin.createRoute(route), admin.getStops(), admin.getStops("route/a"),
      admin.createStop(stop), admin.updateStop("s1", stop), admin.deleteStop("s1"), admin.getBuses(),
      admin.createTrip(trip), admin.updateTripStatus("t1", "In_Progress"),
      admin.createDriver({ name: "D", email: "d@test.com", password: "secret", license_number: "L1" }),
      admin.getIncidents(), admin.getIncidents("Pending"), admin.updateIncidentStatus("i1", "Validated"),
      admin.getTelemetryHistory({ trip_id: "t1", start_time: "a", end_time: "b" }),
      admin.getCurrentTelemetry(),
    ];
    const results = await Promise.all(calls);
    expect(results.every((result) => result.ok)).toBe(true);
    expect(mocks.fetch).toHaveBeenCalledWith("/admin/stops?route_id=route%2Fa", expect.objectContaining({ token: "jwt" }));
    expect(mocks.fetch).toHaveBeenCalledWith("/admin/incidents?status=Pending", expect.objectContaining({ token: "jwt" }));
    expect(mocks.fetch).toHaveBeenCalledWith(expect.stringContaining("/admin/telemetry/history?"), expect.any(Object));
  });
});
