import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  push: vi.fn(), refresh: vi.fn(), route: vi.fn(), stop: vi.fn(), trip: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }) }));
vi.mock("@/app/(admin)/routes/actions", () => ({ saveRouteAction: mocks.route }));
vi.mock("@/app/(admin)/stops/actions", () => ({ saveStopAction: mocks.stop }));
vi.mock("@/app/(admin)/trips/actions", () => ({ saveTripAction: mocks.trip }));
vi.mock("@/components/admin/route-geometry-editor", () => ({
  RouteGeometryEditor: ({ onChange }: any) => <button type="button" onClick={() => onChange({ type: "LineString", coordinates: [[1, 2], [3, 4]] })}>Set geometry</button>,
}));
vi.mock("@/components/admin/stop-location-picker", () => ({
  StopLocationPicker: ({ onChange }: any) => <button type="button" onClick={() => onChange({ lat: 9.9, lng: -84.1 })}>Set location</button>,
}));

import { RouteForm } from "@/components/admin/route-form";
import { StopForm } from "@/components/admin/stop-form";
import { TripForm } from "@/components/admin/trip-form";

const route = { id: "r1", name: "Central", origin: "A", destination: "B", geometry_geojson: { type: "LineString", coordinates: [[1, 2], [3, 4]] }, is_active: true };
const driver = { user_id: "d1", name: "Driver", email: "d@test.com", is_active: true };
const bus = { id: "b1", plate_number: "BUS-1", capacity: 40 };

describe("admin forms", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.route.mockResolvedValue({ ok: true });
    mocks.stop.mockResolvedValue({ ok: true });
    mocks.trip.mockResolvedValue({ ok: true });
  });

  function submit(label: string) {
    fireEvent.submit(screen.getByRole("button", { name: label }).closest("form")!);
  }

  it("validates and creates routes", async () => {
    render(<RouteForm />);
    submit("Crear ruta");
    expect(screen.getByRole("alert").textContent).toContain("nombre");
    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: " Route " } });
    fireEvent.change(screen.getByLabelText("Origen"), { target: { value: " A " } });
    fireEvent.change(screen.getByLabelText("Destino"), { target: { value: " B " } });
    submit("Crear ruta");
    expect(screen.getByRole("alert").textContent).toContain("recorrido");
    fireEvent.click(screen.getByText("Set geometry"));
    mocks.route.mockResolvedValueOnce({ ok: false, message: "Route error" });
    submit("Crear ruta");
    await waitFor(() => expect(screen.getByRole("alert").textContent).toBe("Route error"));
    await waitFor(() => expect(screen.getByText("Crear ruta")).toBeTruthy());
    mocks.route.mockResolvedValueOnce({ ok: true });
    submit("Crear ruta");
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/routes"));
  });

  it("updates an existing route", async () => {
    render(<RouteForm route={route as never} />);
    submit("Guardar cambios");
    await waitFor(() => expect(mocks.route).toHaveBeenCalledWith(expect.objectContaining({ id: "r1", name: "Central" })));
  });

  it("validates every stop field and creates a stop", async () => {
    const { rerender } = render(<StopForm routes={[]} />);
    submit("Crear parada");
    expect(screen.getByRole("alert").textContent).toContain("nombre");
    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Stop" } });
    submit("Crear parada");
    expect(screen.getByRole("alert").textContent).toContain("ruta");
    rerender(<StopForm routes={[route as never]} />);
    fireEvent.change(screen.getByLabelText("Ruta"), { target: { value: "r1" } });
    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: " Stop " } });
    submit("Crear parada");
    expect(screen.getByRole("alert").textContent).toContain("mapa");
    fireEvent.click(screen.getByText("Set location"));
    fireEvent.change(screen.getByLabelText("Orden"), { target: { value: "0" } });
    submit("Crear parada");
    expect(screen.getByRole("alert").textContent).toContain("entero");
    fireEvent.change(screen.getByLabelText("Orden"), { target: { value: "2" } });
    mocks.stop.mockResolvedValueOnce({ ok: false, message: "Stop error" });
    submit("Crear parada");
    await waitFor(() => expect(screen.getByRole("alert").textContent).toBe("Stop error"));
    mocks.stop.mockResolvedValueOnce({ ok: true });
    submit("Crear parada");
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/stops"));
  });

  it("updates an existing stop", async () => {
    const stop = { id: "s1", route_id: "r1", name: "Stop", stop_order: 1, latitude: 9.9, longitude: -84.1 };
    render(<StopForm routes={[route as never]} stop={stop as never} />);
    submit("Guardar cambios");
    await waitFor(() => expect(mocks.stop).toHaveBeenCalledWith(expect.objectContaining({ id: "s1" })));
  });

  it("validates trip selections and schedules a trip", async () => {
    const { rerender } = render(<TripForm routes={[]} drivers={[]} buses={[]} />);
    submit("Programar viaje");
    expect(screen.getByRole("alert").textContent).toContain("ruta");
    rerender(<TripForm routes={[route as never]} drivers={[]} buses={[]} />);
    fireEvent.change(screen.getByLabelText("Ruta"), { target: { value: "r1" } });
    submit("Programar viaje");
    expect(screen.getByRole("alert").textContent).toContain("autob");
    rerender(<TripForm routes={[route as never]} drivers={[]} buses={[bus as never]} />);
    fireEvent.change(screen.getAllByRole("combobox")[1], { target: { value: "b1" } });
    submit("Programar viaje");
    expect(screen.getByRole("alert").textContent).toContain("conductor");
    rerender(<TripForm routes={[route as never]} drivers={[driver as never, { ...driver, user_id: "inactive", is_active: false } as never]} buses={[bus as never]} />);
    fireEvent.change(screen.getByLabelText("Conductor"), { target: { value: "d1" } });
    submit("Programar viaje");
    expect(screen.getByRole("alert").textContent).toContain("hora");
    fireEvent.change(screen.getByLabelText("Hora de salida"), { target: { value: "2026-01-01T12:00" } });
    mocks.trip.mockResolvedValueOnce({ ok: false, message: "Trip error" });
    submit("Programar viaje");
    await waitFor(() => expect(screen.getByRole("alert").textContent).toBe("Trip error"));
    mocks.trip.mockResolvedValueOnce({ ok: true });
    submit("Programar viaje");
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/trips"));
  });
});
