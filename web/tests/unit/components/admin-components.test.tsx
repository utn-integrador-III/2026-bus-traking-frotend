import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  pathname: "/routes/r1",
  replace: vi.fn(), refresh: vi.fn(),
  deactivateRoute: vi.fn(), reactivateRoute: vi.fn(), deactivateDriver: vi.fn(),
  deleteStop: vi.fn(), incidentStatus: vi.fn(), cancelTrip: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  usePathname: () => mocks.pathname,
  useRouter: () => ({ replace: mocks.replace, refresh: mocks.refresh }),
}));
vi.mock("@/app/(admin)/routes/actions", () => ({
  deactivateRouteAction: mocks.deactivateRoute,
  reactivateRouteAction: mocks.reactivateRoute,
}));
vi.mock("@/app/(admin)/users/actions", () => ({ deactivateDriverAction: mocks.deactivateDriver }));
vi.mock("@/app/(admin)/stops/actions", () => ({ deleteStopAction: mocks.deleteStop }));
vi.mock("@/app/(admin)/incidents/actions", () => ({ updateIncidentStatusAction: mocks.incidentStatus }));
vi.mock("@/app/(admin)/trips/actions", () => ({ cancelTripAction: mocks.cancelTrip }));

import { Badge } from "@/components/admin/badge";
import { Button } from "@/components/admin/button";
import { DriverRow } from "@/components/admin/driver-row";
import { FilterChips } from "@/components/admin/filter-chips";
import { IncidentRow } from "@/components/admin/incident-row";
import { LoadError, NoBackend } from "@/components/admin/load-error";
import { PageHeader } from "@/components/admin/page-header";
import { RouteCard } from "@/components/admin/route-card";
import { Sidebar } from "@/components/admin/sidebar";
import { StatCard } from "@/components/admin/stat-card";
import { StopRow } from "@/components/admin/stop-row";
import { Tabs } from "@/components/admin/tabs";
import { Toggle } from "@/components/admin/toggle";
import { TripRow } from "@/components/admin/trip-row";

describe("admin UI primitives", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.deactivateRoute.mockResolvedValue({ ok: true });
    mocks.reactivateRoute.mockResolvedValue({ ok: true });
    mocks.deactivateDriver.mockResolvedValue({ ok: true });
    mocks.deleteStop.mockResolvedValue({ ok: true });
    mocks.incidentStatus.mockResolvedValue({ ok: true });
    mocks.cancelTrip.mockResolvedValue({ ok: true });
  });

  it("renders buttons, badges, headers, stats and controls", () => {
    const onChange = vi.fn();
    const { rerender } = render(<>
      <Badge tone="success">Ready</Badge>
      <Button icon="check" full onClick={onChange}>Save</Button>
      <Button href="/routes" variant="outline">Link</Button>
      <PageHeader title="Routes" subtitle="Manage" action={<span>Action</span>} />
      <StatCard label="Active" value={3} tone="warning" icon="bus" />
      <FilterChips options={[{ value: "all", label: "All" }, { value: "open", label: "Open" }]} value="all" onChange={onChange} />
      <Tabs options={[{ value: "map", label: "Map" }, { value: "list", label: "List" }]} value="map" onChange={onChange} />
      <Toggle checked={false} onChange={onChange} label="Enabled" />
    </>);
    fireEvent.click(screen.getByText("Save"));
    fireEvent.click(screen.getByText("Open"));
    fireEvent.click(screen.getByText("List"));
    fireEvent.click(screen.getByRole("switch"));
    expect(onChange).toHaveBeenCalledWith(true);
    expect(screen.getByText("Ready")).toBeTruthy();
    rerender(<><PageHeader title="Only" /><StatCard label="Plain" value="-" /><Toggle checked onChange={onChange} /></>);
    expect(screen.getByText("Only")).toBeTruthy();
  });

  it("renders load failures and no-backend placeholders", () => {
    const { rerender } = render(<LoadError failure={{ ok: false, kind: "auth", message: "Expired" }} />);
    expect(screen.getByText(/sesi.*v.*lida/)).toBeTruthy();
    expect(screen.getByText(/Iniciar sesi/)).toBeTruthy();
    rerender(<LoadError failure={{ ok: false, kind: "unreachable", message: "Offline" }} />);
    expect(screen.queryByText(/Iniciar sesi/)).toBeNull();
    rerender(<LoadError failure={{ ok: false, kind: "error", message: "Bad" }} />);
    expect(screen.getByText(/devolvi.*un error/)).toBeTruthy();
    rerender(<NoBackend what="Drivers unavailable." />);
    expect(screen.getByText(/Drivers unavailable/)).toBeTruthy();
  });

  it("renders sidebar active state, fallback name and logout", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const onNavigate = vi.fn();
    render(<Sidebar user={{ id: "u", email: "admin@test.com", role: "Admin", name: null }} onNavigate={onNavigate} />);
    expect(screen.getByText("Administrador")).toBeTruthy();
    expect(screen.getByText("Rutas").closest("a")?.getAttribute("aria-current")).toBe("page");
    const panelLink = screen.getByText("Panel").closest("a")!;
    panelLink.addEventListener("click", (event) => event.preventDefault());
    fireEvent.click(panelLink);
    expect(onNavigate).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /Cerrar sesi/ }));
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/login"));
    expect(mocks.refresh).toHaveBeenCalled();
  });

  it("toggles active and inactive routes and shows errors", async () => {
    const route = { id: "r1", name: "Central", origin: "A", destination: "B", is_active: true, created_at: "invalid", geometry_geojson: null };
    const { rerender } = render(<RouteCard route={route as never} />);
    expect(screen.getByText("Sin trazado")).toBeTruthy();
    expect(screen.getByText("Fecha desconocida")).toBeTruthy();
    mocks.deactivateRoute.mockResolvedValueOnce({ ok: false, message: "Cannot deactivate" });
    fireEvent.click(screen.getByText("Desactivar"));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toBe("Cannot deactivate"));
    rerender(<RouteCard route={{ ...route, is_active: false, geometry_geojson: { type: "LineString", coordinates: [[1, 2]] }, created_at: "2026-01-01" } as never} />);
    fireEvent.click(screen.getByText("Reactivar"));
    await waitFor(() => expect(mocks.reactivateRoute).toHaveBeenCalledWith("r1"));
  });

  it("confirms driver deactivation, cancellation and error", async () => {
    const driver = { user_id: "d1", name: "Driver", email: "d@test.com", license_number: "L", is_active: true };
    const { rerender } = render(<DriverRow driver={driver as never} />);
    fireEvent.click(screen.getByText("Desactivar"));
    fireEvent.click(screen.getByText("Cancelar"));
    fireEvent.click(screen.getByText("Desactivar"));
    mocks.deactivateDriver.mockResolvedValueOnce({ ok: false, message: "Driver busy" });
    fireEvent.click(screen.getByText(/desactivar$/i));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toBe("Driver busy"));
    rerender(<DriverRow driver={{ ...driver, is_active: false } as never} />);
    expect(screen.getByText("Inactivo")).toBeTruthy();
  });

  it("confirms stop deletion and reports errors", async () => {
    const stop = { id: "s1", name: "Central", stop_order: 1, latitude: 9.9, longitude: -84.1 };
    render(<StopRow stop={stop as never} routeName="Route" />);
    fireEvent.click(screen.getByText("Eliminar"));
    mocks.deleteStop.mockResolvedValueOnce({ ok: false, message: "Stop used" });
    fireEvent.click(screen.getByText(/eliminar$/i));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toBe("Stop used"));
  });

  it("updates incident statuses and supports non-pending incidents", async () => {
    const incident = { id: "i1", type: "Delay", status: "Pending", description: "Traffic", timestamp: "invalid", latitude: 9.9, longitude: -84.1, user_id: "user-123456" };
    const { rerender } = render(<IncidentRow incident={incident as never} tripName="Trip" />);
    mocks.incidentStatus.mockResolvedValueOnce({ ok: false, message: "Update failed" });
    fireEvent.click(screen.getByText("Validar"));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toBe("Update failed"));
    fireEvent.click(screen.getByText("Archivar"));
    await waitFor(() => expect(mocks.incidentStatus).toHaveBeenCalledWith("i1", "Archived"));
    fireEvent.click(screen.getByText("Descartar"));
    await waitFor(() => expect(mocks.incidentStatus).toHaveBeenCalledWith("i1", "Dismissed"));
    rerender(<IncidentRow incident={{ ...incident, status: "Archived", description: null, timestamp: "2026-01-01" } as never} tripName="Trip" />);
    expect(screen.queryByText("Validar")).toBeNull();
  });

  it("cancels eligible trips and renders terminal trips", async () => {
    const { rerender } = render(<TripRow tripId="t1" routeName="Route" driverName="Driver" busPlate={null} departureTime="invalid" status="Scheduled" />);
    expect(screen.getByText(/Sin hora/)).toBeTruthy();
    fireEvent.click(screen.getByText("Cancelar"));
    mocks.cancelTrip.mockResolvedValueOnce({ ok: false, message: "Trip started" });
    fireEvent.click(screen.getByText(/cancelar$/i));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toBe("Trip started"));
    rerender(<TripRow tripId="t2" routeName="Route" driverName="Driver" busPlate="BUS" departureTime="2026-01-01" status="Completed" />);
    expect(screen.getByText("Completado")).toBeTruthy();
    expect(screen.queryByText("Cancelar")).toBeNull();
  });
});
