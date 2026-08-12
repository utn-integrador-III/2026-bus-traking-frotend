import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  routes: vi.fn(), trips: vi.fn(), drivers: vi.fn(), buses: vi.fn(),
  stops: vi.fn(), incidents: vi.fn(), telemetry: vi.fn(), session: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
  usePathname: () => "/dashboard",
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("next/font/google", () => ({
  Plus_Jakarta_Sans: () => ({ variable: "font-test" }),
}));
vi.mock("@/lib/auth/session", () => ({ readSession: mocks.session }));
vi.mock("@/lib/api/admin", () => ({
  getRoutes: mocks.routes, getTrips: mocks.trips, getDrivers: mocks.drivers,
  getBuses: mocks.buses, getStops: mocks.stops, getIncidents: mocks.incidents,
  getCurrentTelemetry: mocks.telemetry,
}));
vi.mock("@/components/admin/live-telemetry-map", () => ({
  LiveTelemetryMap: ({ activeTrips }: any) => <div>live:{activeTrips.length}</div>,
}));
vi.mock("@/components/admin/telemetry-history", () => ({
  TelemetryHistory: ({ trips }: any) => <div>history:{trips.length}</div>,
}));
vi.mock("@/components/admin/route-form", () => ({
  RouteForm: ({ route }: any) => <div>route-form:{route?.id ?? "new"}</div>,
}));
vi.mock("@/components/admin/stop-form", () => ({
  StopForm: ({ stop, initialRouteId }: any) => <div>stop-form:{stop?.id ?? initialRouteId ?? "new"}</div>,
}));
vi.mock("@/components/admin/trip-form", () => ({
  TripForm: ({ routes }: any) => <div>trip-form:{routes.length}</div>,
}));

import Home from "@/app/page";
import DashboardPage from "@/app/(admin)/dashboard/page";
import IncidentsPage from "@/app/(admin)/incidents/page";
import RoutesPage from "@/app/(admin)/routes/page";
import NewRoutePage from "@/app/(admin)/routes/new/page";
import EditRoutePage from "@/app/(admin)/routes/[id]/edit/page";
import StopsPage from "@/app/(admin)/stops/page";
import NewStopPage from "@/app/(admin)/stops/new/page";
import EditStopPage from "@/app/(admin)/stops/[id]/edit/page";
import TelemetryPage from "@/app/(admin)/telemetry/page";
import TripsPage from "@/app/(admin)/trips/page";
import NewTripPage from "@/app/(admin)/trips/new/page";
import UsersPage from "@/app/(admin)/users/page";
import LoginPage from "@/app/login/page";
import RootLayout from "@/app/layout";
import AdminLayout from "@/app/(admin)/layout";
import LoginLayout from "@/app/login/layout";
import { AdminShell } from "@/components/admin/admin-shell";

const route = { id: "r1", name: "Route One", origin: "A", destination: "B", is_active: true, geometry_geojson: { type: "LineString", coordinates: [[-84, 10], [-84.1, 10.1]] } };
const trip = { id: "t1", route_id: "r1", bus_id: "b1", driver_id: "u1", departure_time: "2026-01-01T10:00:00Z", status: "In_Progress" };
const driver = { user_id: "u1", name: "Driver One", email: "d@test.com", license_number: "L1", is_active: true };
const bus = { id: "b1", plate_number: "BUS-1", capacity: 40 };
const stop = { id: "s1", route_id: "r1", name: "Stop One", latitude: 10, longitude: -84, stop_order: 2 };
const incident = { id: "i1", trip_id: "t1", user_id: "user-12345678", type: "Traffic", description: "Traffic jam", latitude: 10, longitude: -84, timestamp: "2026-01-01T11:00:00Z", status: "Pending" };
const ok = (data: any[] = []) => ({ ok: true, data });
const failure = { ok: false, kind: "error", message: "load failed" };

async function pageText(value: React.ReactNode | Promise<React.ReactNode>) {
  const view = render(<>{await value}</>);
  const content = view.container.textContent ?? "";
  view.unmount();
  return content;
}

describe("Next.js pages", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    mocks.routes.mockResolvedValue(ok([route]));
    mocks.trips.mockResolvedValue(ok([trip]));
    mocks.drivers.mockResolvedValue(ok([driver]));
    mocks.buses.mockResolvedValue(ok([bus]));
    mocks.stops.mockResolvedValue(ok([stop]));
    mocks.incidents.mockResolvedValue(ok([incident]));
    mocks.telemetry.mockResolvedValue(ok([]));
    mocks.session.mockResolvedValue(null);
  });

  it("renders dashboard success, partial failures and fatal failures", async () => {
    expect(await pageText(DashboardPage())).toContain("live:1");
    mocks.telemetry.mockResolvedValueOnce(failure);
    mocks.trips.mockResolvedValueOnce(failure);
    mocks.drivers.mockResolvedValueOnce(failure);
    expect(await pageText(DashboardPage())).toContain("estado inicial");
    mocks.routes.mockResolvedValueOnce(failure);
    expect(await pageText(DashboardPage())).toContain("load failed");
  });

  it("renders incident filters, rows, empty state and failures", async () => {
    expect(await pageText(IncidentsPage({ searchParams: Promise.resolve({ status: "Pending" }) }))).toContain("Traffic jam");
    mocks.incidents.mockResolvedValueOnce(ok([]));
    mocks.trips.mockResolvedValueOnce(failure);
    mocks.routes.mockResolvedValueOnce(failure);
    expect(await pageText(IncidentsPage({ searchParams: Promise.resolve({ status: "invalid" }) }))).toContain("No hay reportes");
    mocks.incidents.mockResolvedValueOnce(failure);
    expect(await pageText(IncidentsPage({ searchParams: Promise.resolve({}) }))).toContain("load failed");
  });

  it("renders route list and route creation/editing states", async () => {
    expect(await pageText(RoutesPage())).toContain("Route One");
    mocks.routes.mockResolvedValueOnce(ok([]));
    expect(await pageText(RoutesPage())).toContain("No hay rutas");
    mocks.routes.mockResolvedValueOnce(failure);
    expect(await pageText(RoutesPage())).toContain("load failed");
    expect(await pageText(NewRoutePage())).toContain("route-form:new");
    expect(await pageText(EditRoutePage({ params: Promise.resolve({ id: "r1" }) }))).toContain("route-form:r1");
    expect(await pageText(EditRoutePage({ params: Promise.resolve({ id: "missing" }) }))).toContain("Ruta no encontrada");
    mocks.routes.mockResolvedValueOnce(failure);
    expect(await pageText(EditRoutePage({ params: Promise.resolve({ id: "r1" }) }))).toContain("load failed");
  });

  it("renders stop list filters, empty and failure states", async () => {
    mocks.routes.mockResolvedValueOnce(ok([route, { ...route, id: "r2", name: "Route Two" }]));
    expect(await pageText(StopsPage({ searchParams: Promise.resolve({ route_id: "r1" }) }))).toContain("Stop One");
    mocks.stops.mockResolvedValueOnce(ok([]));
    expect(await pageText(StopsPage({ searchParams: Promise.resolve({ route_id: "unknown" }) }))).toContain("No hay paradas");
    mocks.routes.mockResolvedValueOnce(failure);
    expect(await pageText(StopsPage({ searchParams: Promise.resolve({}) }))).toContain("load failed");
    mocks.stops.mockResolvedValueOnce(failure);
    expect(await pageText(StopsPage({ searchParams: Promise.resolve({}) }))).toContain("load failed");
  });

  it("renders new and edit stop states", async () => {
    expect(await pageText(NewStopPage({ searchParams: Promise.resolve({ route_id: "r1" }) }))).toContain("stop-form:r1");
    expect(await pageText(NewStopPage({ searchParams: Promise.resolve({ route_id: "bad" }) }))).toContain("stop-form:new");
    mocks.routes.mockResolvedValueOnce(ok([]));
    expect(await pageText(NewStopPage({ searchParams: Promise.resolve({}) }))).toContain("No hay rutas");
    mocks.routes.mockResolvedValueOnce(failure);
    expect(await pageText(NewStopPage({ searchParams: Promise.resolve({}) }))).toContain("load failed");
    expect(await pageText(EditStopPage({ params: Promise.resolve({ id: "s1" }) }))).toContain("stop-form:s1");
    expect(await pageText(EditStopPage({ params: Promise.resolve({ id: "missing" }) }))).toContain("Parada no encontrada");
    mocks.routes.mockResolvedValueOnce(failure);
    expect(await pageText(EditStopPage({ params: Promise.resolve({ id: "s1" }) }))).toContain("load failed");
    mocks.stops.mockResolvedValueOnce(failure);
    expect(await pageText(EditStopPage({ params: Promise.resolve({ id: "s1" }) }))).toContain("load failed");
  });

  it("renders telemetry history and both dependency failures", async () => {
    expect(await pageText(TelemetryPage())).toContain("history:1");
    mocks.trips.mockResolvedValueOnce(failure);
    expect(await pageText(TelemetryPage())).toContain("load failed");
    mocks.routes.mockResolvedValueOnce(failure);
    expect(await pageText(TelemetryPage())).toContain("load failed");
  });

  it("renders trip list, empty state and dependency failures", async () => {
    expect(await pageText(TripsPage())).toContain("Route One");
    mocks.trips.mockResolvedValueOnce(ok([]));
    expect(await pageText(TripsPage())).toContain("No hay viajes");
    mocks.trips.mockResolvedValueOnce(failure);
    expect(await pageText(TripsPage())).toContain("load failed");
    mocks.routes.mockResolvedValueOnce(failure);
    mocks.drivers.mockResolvedValueOnce(failure);
    mocks.buses.mockResolvedValueOnce(failure);
    expect(await pageText(TripsPage())).toContain("Viaje");
  });

  it("renders new trip success, missing data and dependency failures", async () => {
    expect(await pageText(NewTripPage())).toContain("trip-form:1");
    mocks.routes.mockResolvedValueOnce(ok([]));
    expect(await pageText(NewTripPage())).toContain("Faltan datos base");
    for (const dependency of [mocks.routes, mocks.drivers, mocks.buses]) {
      dependency.mockResolvedValueOnce(failure);
      expect(await pageText(NewTripPage())).toContain("load failed");
    }
  });

  it("renders users in populated, empty and failed states", async () => {
    expect(await pageText(UsersPage())).toContain("Driver One");
    mocks.drivers.mockResolvedValueOnce(ok([]));
    expect(await pageText(UsersPage())).toContain("No hay conductores");
    mocks.drivers.mockResolvedValueOnce(failure);
    expect(await pageText(UsersPage())).toContain("load failed");
  });

  it("handles login destinations, redirects and the home redirect", async () => {
    expect(await pageText(LoginPage({ searchParams: Promise.resolve({ next: "/routes" }) }))).toContain("Bienvenido");
    expect(await pageText(LoginPage({ searchParams: Promise.resolve({ next: ["/bad"] }) }))).toContain("Bienvenido");
    expect(await pageText(LoginPage({ searchParams: Promise.resolve({}) }))).toContain("Bienvenido");
    mocks.session.mockResolvedValueOnce({ user: { id: "u1", role: "Admin" } });
    await LoginPage({ searchParams: Promise.resolve({}) });
    expect(mocks.redirect).toHaveBeenCalledWith("/dashboard");
    Home();
    expect(mocks.redirect).toHaveBeenCalledWith("/dashboard");
  });
});

describe("layouts and admin shell", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    mocks.session.mockResolvedValue({ user: { id: "u1", name: "Admin", email: "a@test.com", role: "Admin" } });
  });

  it("executes root and login layouts", async () => {
    expect(RootLayout({ children: <span>root child</span> }).type).toBe("html");
    await expect(pageText(LoginLayout({ children: <span>login child</span> }))).resolves.toContain("login child");
  });

  it("protects the admin layout", async () => {
    expect(await pageText(AdminLayout({ children: <span>admin child</span> }))).toContain("admin child");
    mocks.session.mockResolvedValueOnce(null);
    mocks.redirect.mockImplementationOnce(() => { throw new Error("redirect"); });
    await expect(AdminLayout({ children: null })).rejects.toThrow("redirect");
    expect(mocks.redirect).toHaveBeenCalledWith("/login");
    mocks.session.mockResolvedValueOnce({ user: { role: "Driver" } });
    mocks.redirect.mockImplementationOnce(() => { throw new Error("redirect"); });
    await expect(AdminLayout({ children: null })).rejects.toThrow("redirect");
    expect(mocks.redirect).toHaveBeenCalledTimes(2);
  });

  it("opens and closes the mobile admin navigation", () => {
    render(<AdminShell user={{ id: "u1", name: "Admin", email: "a@test.com", role: "Admin" } as never}><span>content</span></AdminShell>);
    fireEvent.click(screen.getByLabelText("Abrir menú"));
    expect(screen.getByLabelText("Cerrar menú")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Cerrar menú"));
    expect(screen.queryByLabelText("Cerrar menú")).toBeNull();
  });
});
