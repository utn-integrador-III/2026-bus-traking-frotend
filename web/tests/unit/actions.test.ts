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
    revalidate: vi.fn(), createRoute: vi.fn(), updateRoute: vi.fn(),
    deactivateRoute: vi.fn(), reactivateRoute: vi.fn(), createStop: vi.fn(),
    updateStop: vi.fn(), deleteStop: vi.fn(), createTrip: vi.fn(),
    updateTripStatus: vi.fn(), updateIncidentStatus: vi.fn(),
    getTelemetryHistory: vi.fn(), deactivateDriver: vi.fn(), apiFetch: vi.fn(),
    writeSession: vi.fn(), clearSession: vi.fn(), MockApiError, MockApiUnreachableError,
  };
});

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("@/lib/api/admin", () => ({
  createRoute: mocks.createRoute, updateRoute: mocks.updateRoute,
  deactivateRoute: mocks.deactivateRoute, reactivateRoute: mocks.reactivateRoute,
  createStop: mocks.createStop, updateStop: mocks.updateStop, deleteStop: mocks.deleteStop,
  createTrip: mocks.createTrip, updateTripStatus: mocks.updateTripStatus,
  updateIncidentStatus: mocks.updateIncidentStatus,
  getTelemetryHistory: mocks.getTelemetryHistory, deactivateDriver: mocks.deactivateDriver,
}));
vi.mock("@/lib/api/client", () => ({
  apiFetch: mocks.apiFetch,
  ApiError: mocks.MockApiError,
  ApiUnreachableError: mocks.MockApiUnreachableError,
}));
vi.mock("@/lib/auth/session", () => ({
  writeSession: mocks.writeSession,
  clearSession: mocks.clearSession,
}));

import {
  deactivateRouteAction, reactivateRouteAction, saveRouteAction,
} from "@/app/(admin)/routes/actions";
import { deleteStopAction, saveStopAction } from "@/app/(admin)/stops/actions";
import { cancelTripAction, saveTripAction } from "@/app/(admin)/trips/actions";
import { updateIncidentStatusAction } from "@/app/(admin)/incidents/actions";
import { loadTelemetryHistoryAction } from "@/app/(admin)/telemetry/actions";
import { deactivateDriverAction } from "@/app/(admin)/users/actions";
import { DELETE, POST } from "@/app/api/session/route";

const geometry = {
  type: "LineString" as const,
  coordinates: [[-84.1, 9.9], [-84.2, 10]] as [number, number][],
};

describe("admin server actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const mock of [
      mocks.createRoute, mocks.updateRoute, mocks.deactivateRoute,
      mocks.reactivateRoute, mocks.createStop, mocks.updateStop, mocks.deleteStop,
      mocks.createTrip, mocks.updateTripStatus, mocks.updateIncidentStatus,
      mocks.getTelemetryHistory, mocks.deactivateDriver,
    ]) mock.mockResolvedValue({ ok: true, data: [] });
  });

  it("validates route input and creates or updates routes", async () => {
    await expect(saveRouteAction({ name: " ", origin: "A", destination: "B", geometry_geojson: geometry })).resolves.toMatchObject({ ok: false });
    for (const invalid of [
      { type: "LineString", coordinates: [[1, 2]] },
      { type: "LineString", coordinates: [[1], [2, 3]] },
      { type: "LineString", coordinates: [[Number.NaN, 2], [2, 3]] },
    ]) {
      await expect(saveRouteAction({ name: "R", origin: "A", destination: "B", geometry_geojson: invalid as never })).resolves.toMatchObject({ ok: false });
    }
    await expect(saveRouteAction({ name: " R ", origin: " A ", destination: " B ", geometry_geojson: geometry })).resolves.toEqual({ ok: true });
    expect(mocks.createRoute).toHaveBeenCalledWith(expect.objectContaining({ name: "R" }));
    await expect(saveRouteAction({ id: "r1", name: "R", origin: "A", destination: "B", geometry_geojson: geometry })).resolves.toEqual({ ok: true });
    expect(mocks.updateRoute).toHaveBeenCalledWith("r1", expect.any(Object));
    mocks.createRoute.mockResolvedValueOnce({ ok: false, message: "route error" });
    await expect(saveRouteAction({ name: "R", origin: "A", destination: "B", geometry_geojson: geometry })).resolves.toEqual({ ok: false, message: "route error" });
  });

  it("deactivates and reactivates routes", async () => {
    await expect(deactivateRouteAction("r1")).resolves.toEqual({ ok: true });
    await expect(reactivateRouteAction("r1")).resolves.toEqual({ ok: true });
    mocks.deactivateRoute.mockResolvedValueOnce({ ok: false, message: "no" });
    mocks.reactivateRoute.mockResolvedValueOnce({ ok: false, message: "no" });
    await expect(deactivateRouteAction("r1")).resolves.toMatchObject({ ok: false });
    await expect(reactivateRouteAction("r1")).resolves.toMatchObject({ ok: false });
  });

  it("validates, saves and deletes stops", async () => {
    const valid = { name: " Stop ", route_id: "r1", latitude: 9.9, longitude: -84, stop_order: 1 };
    for (const invalid of [
      { ...valid, name: " " }, { ...valid, route_id: "" },
      { ...valid, latitude: Number.NaN }, { ...valid, longitude: Infinity },
      { ...valid, stop_order: 1.5 }, { ...valid, stop_order: 0 },
    ]) await expect(saveStopAction(invalid)).resolves.toMatchObject({ ok: false });
    await expect(saveStopAction(valid)).resolves.toEqual({ ok: true });
    await expect(saveStopAction({ ...valid, id: "s1" })).resolves.toEqual({ ok: true });
    expect(mocks.createStop).toHaveBeenCalledWith(expect.objectContaining({ name: "Stop" }));
    expect(mocks.updateStop).toHaveBeenCalledWith("s1", expect.any(Object));
    mocks.createStop.mockResolvedValueOnce({ ok: false, message: "stop error" });
    await expect(saveStopAction(valid)).resolves.toMatchObject({ ok: false });
    await expect(deleteStopAction("s1")).resolves.toEqual({ ok: true });
    mocks.deleteStop.mockResolvedValueOnce({ ok: false, message: "delete error" });
    await expect(deleteStopAction("s1")).resolves.toMatchObject({ ok: false });
  });

  it("validates, saves and cancels trips", async () => {
    const valid = { route_id: " r1 ", bus_id: " b1 ", driver_id: " d1 ", departure_time: "2026-01-01T10:00:00Z" };
    for (const invalid of [
      { ...valid, route_id: "" }, { ...valid, bus_id: "" }, { ...valid, driver_id: "" },
    ]) await expect(saveTripAction(invalid)).resolves.toMatchObject({ ok: false });
    await expect(saveTripAction({ ...valid, departure_time: "bad" })).resolves.toMatchObject({ ok: false });
    await expect(saveTripAction(valid)).resolves.toEqual({ ok: true });
    expect(mocks.createTrip).toHaveBeenCalledWith(expect.objectContaining({ route_id: "r1" }));
    mocks.createTrip.mockResolvedValueOnce({ ok: false, message: "trip error" });
    await expect(saveTripAction(valid)).resolves.toMatchObject({ ok: false });
    await expect(cancelTripAction("t1")).resolves.toEqual({ ok: true });
    mocks.updateTripStatus.mockResolvedValueOnce({ ok: false, message: "cancel error" });
    await expect(cancelTripAction("t1")).resolves.toMatchObject({ ok: false });
  });

  it("moderates incidents and deactivates drivers", async () => {
    await expect(updateIncidentStatusAction("i1", "unknown" as never)).resolves.toMatchObject({ ok: false });
    await expect(updateIncidentStatusAction("i1", "Validated")).resolves.toEqual({ ok: true });
    mocks.updateIncidentStatus.mockResolvedValueOnce({ ok: false, message: "incident error" });
    await expect(updateIncidentStatusAction("i1", "Archived")).resolves.toMatchObject({ ok: false });
    await expect(deactivateDriverAction("d1")).resolves.toEqual({ ok: true });
    mocks.deactivateDriver.mockResolvedValueOnce({ ok: false, message: "driver error" });
    await expect(deactivateDriverAction("d1")).resolves.toMatchObject({ ok: false });
  });

  it("validates and loads telemetry history", async () => {
    await expect(loadTelemetryHistoryAction({ trip_id: " ", start_time: "a", end_time: "b" })).resolves.toMatchObject({ ok: false });
    await expect(loadTelemetryHistoryAction({ trip_id: "t", start_time: "bad", end_time: "bad" })).resolves.toMatchObject({ ok: false });
    await expect(loadTelemetryHistoryAction({ trip_id: "t", start_time: "2026-01-02", end_time: "2026-01-01" })).resolves.toMatchObject({ ok: false });
    const valid = { trip_id: " t1 ", start_time: "2026-01-01T10:00:00Z", end_time: "2026-01-01T11:00:00Z" };
    await expect(loadTelemetryHistoryAction(valid)).resolves.toEqual({ ok: true, data: [] });
    expect(mocks.getTelemetryHistory).toHaveBeenCalledWith(expect.objectContaining({ trip_id: "t1" }));
    mocks.getTelemetryHistory.mockResolvedValueOnce({ ok: false, message: "history error" });
    await expect(loadTelemetryHistoryAction(valid)).resolves.toMatchObject({ ok: false });
  });
});

describe("session API route", () => {
  const adminLogin = { access_token: "jwt", expires_in: 3600, user: { id: "u1", role: "Admin" } };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.apiFetch.mockResolvedValue(adminLogin);
  });

  const request = (body: unknown) => new Request("http://localhost/api/session", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
  });

  it("rejects malformed credentials and non-admin users", async () => {
    expect((await POST(request({ email: "bad", password: "" }))).status).toBe(400);
    expect((await POST(new Request("http://localhost", { method: "POST", body: "{" }))).status).toBe(400);
    mocks.apiFetch.mockResolvedValueOnce({ ...adminLogin, user: { role: "Driver" } });
    expect((await POST(request({ email: "admin@test.com", password: "secret" }))).status).toBe(403);
  });

  it("creates and clears an admin session", async () => {
    const response = await POST(request({ email: "admin@test.com", password: "secret" }));
    expect(response.status).toBe(200);
    expect(mocks.writeSession).toHaveBeenCalledWith("jwt", 3600);
    expect((await DELETE()).status).toBe(200);
    expect(mocks.clearSession).toHaveBeenCalled();
  });

  it("maps API errors and rethrows unknown failures", async () => {
    mocks.apiFetch.mockRejectedValueOnce(new mocks.MockApiUnreachableError());
    expect((await POST(request({ email: "admin@test.com", password: "x" }))).status).toBe(503);
    mocks.apiFetch.mockRejectedValueOnce(new mocks.MockApiError(401, "unauthorized"));
    expect(await (await POST(request({ email: "admin@test.com", password: "x" }))).json()).toMatchObject({ message: expect.stringContaining("incorrectos") });
    mocks.apiFetch.mockRejectedValueOnce(new mocks.MockApiError(422, "invalid"));
    expect((await POST(request({ email: "admin@test.com", password: "x" }))).status).toBe(422);
    mocks.apiFetch.mockRejectedValueOnce(new Error("boom"));
    await expect(POST(request({ email: "admin@test.com", password: "x" }))).rejects.toThrow("boom");
  });
});
