import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  instances: [] as any[], source: { setData: vi.fn() }, history: vi.fn(),
  client: null as any, realtimeCallback: undefined as any, subscribeCallback: undefined as any,
}));
vi.mock("maplibre-gl", () => {
  class Map {
    events: Record<string, (...args: any[]) => void> = {};
    addControl = vi.fn(); addSource = vi.fn(); addLayer = vi.fn(); fitBounds = vi.fn(); remove = vi.fn();
    getSource = vi.fn(() => mocks.source);
    constructor() { mocks.instances.push(this); }
    on(event: string, callback: (...args: any[]) => void) { this.events[event] = callback; return this; }
  }
  return { Map, NavigationControl: class NavigationControl {} };
});
vi.mock("@/lib/supabase", () => ({ getSupabaseClient: () => mocks.client }));
vi.mock("@/app/(admin)/telemetry/actions", () => ({ loadTelemetryHistoryAction: mocks.history }));
vi.mock("@/components/admin/telemetry-track-map", async () => {
  const actual = await vi.importActual<any>("@/components/admin/telemetry-track-map");
  return actual;
});

import { LiveTelemetryMap } from "@/components/admin/live-telemetry-map";
import { TelemetryHistory } from "@/components/admin/telemetry-history";
import { TelemetryTrackMap } from "@/components/admin/telemetry-track-map";

const route = { id: "r1", name: "Route", origin: "A", destination: "B", is_active: true, geometry_geojson: { type: "LineString", coordinates: [[-84.1, 9.9], [-84.2, 10]] } };
const trip = { id: "t1", route_id: "r1", bus_id: "b1", driver_id: "d1", departure_time: "2026-01-01T10:00:00Z", status: "In_Progress" };
const point = { trip_id: "t1", route_id: "r1", latitude: 9.9, longitude: -84.1, speed: 20, heading: 1, timestamp: "2026-01-01T10:00:00Z", status: "In_Progress" };

describe("telemetry components", () => {
  beforeEach(() => {
    mocks.instances.length = 0;
    mocks.client = null;
    mocks.realtimeCallback = undefined;
    mocks.subscribeCallback = undefined;
    vi.clearAllMocks();
    mocks.history.mockResolvedValue({ ok: true, data: [] });
  });

  async function loadMap(index = 0) {
    await waitFor(() => expect(mocks.instances.length).toBeGreaterThan(index));
    act(() => mocks.instances[index].events.load());
  }

  it("renders live telemetry empty and connected states", async () => {
    const { rerender, unmount } = render(<LiveTelemetryMap routes={[]} activeTrips={[]} initialTelemetry={[]} />);
    expect(screen.getByText(/Ninguna ruta/)).toBeTruthy();

    const channel: any = {
      on: vi.fn((_type: string, _filter: object, callback: any) => {
        mocks.realtimeCallback = callback;
        return channel;
      }),
      subscribe: vi.fn((callback: any) => { mocks.subscribeCallback = callback; return channel; }),
    };
    mocks.client = { channel: vi.fn(() => channel), removeChannel: vi.fn() };
    rerender(<LiveTelemetryMap routes={[route as never]} activeTrips={[trip as never]} initialTelemetry={[point as never]} />);
    await loadMap();
    act(() => mocks.subscribeCallback("SUBSCRIBED"));
    expect(screen.getByText(/En vivo/)).toBeTruthy();
    act(() => mocks.realtimeCallback({ new: { latitude: 10, longitude: -84, speed: null, heading: null, timestamp: "now" } }));
    await waitFor(() => expect(mocks.source.setData).toHaveBeenCalled());
    act(() => mocks.realtimeCallback({ new: { latitude: "bad", longitude: -84 } }));
    fireEvent.click(screen.getByText("Ajustar vista"));
    expect(mocks.instances[0].fitBounds).toHaveBeenCalled();
    unmount();
    expect(mocks.client.removeChannel).toHaveBeenCalled();
  });

  it("renders telemetry tracks and map bounds", async () => {
    const { rerender, unmount } = render(<TelemetryTrackMap points={[]} />);
    expect(screen.getByText(/suficientes puntos/)).toBeTruthy();
    const points = [point, { ...point, longitude: -84.2, latitude: 10, speed: 40, timestamp: "2026-01-01T11:30:00Z" }];
    rerender(<TelemetryTrackMap points={points as never} />);
    await loadMap();
    expect(mocks.instances[0].addSource).toHaveBeenCalledTimes(2);
    expect(screen.getByText(/2 puntos/)).toBeTruthy();
    unmount();

    render(<TelemetryTrackMap points={[point, { ...point, timestamp: "later" }] as never} />);
    await loadMap(1);
    expect(mocks.instances[1].fitBounds).toHaveBeenCalled();
  });

  it("validates telemetry search and displays API failures", async () => {
    const { rerender } = render(<TelemetryHistory trips={[]} routes={[]} />);
    fireEvent.click(screen.getByText("Consultar traza"));
    expect(screen.getByRole("alert").textContent).toContain("viaje");
    rerender(<TelemetryHistory trips={[trip as never]} routes={[route as never]} />);
    fireEvent.change(screen.getByLabelText("Viaje"), { target: { value: "t1" } });
    fireEvent.change(screen.getByLabelText("Desde"), { target: { value: "2026-01-01T09:00" } });
    fireEvent.change(screen.getByLabelText("Hasta"), { target: { value: "2026-01-01T12:00" } });
    mocks.history.mockResolvedValueOnce({ ok: false, message: "History failed" });
    fireEvent.click(screen.getByText("Consultar traza"));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toBe("History failed"));
  });

  it("computes telemetry statistics for successful searches", async () => {
    const points = [point, { ...point, speed: 40, timestamp: "2026-01-01T11:30:00Z", longitude: -84.2 }];
    mocks.history.mockResolvedValueOnce({ ok: true, data: points });
    render(<TelemetryHistory trips={[trip as never]} routes={[route as never]} />);
    fireEvent.click(screen.getByText("Consultar traza"));
    await waitFor(() => expect(screen.getByText("1h 30m")).toBeTruthy());
    expect(screen.getByText("30.0")).toBeTruthy();
    expect(screen.getByText("40.0")).toBeTruthy();
    expect(screen.getByText(/2 lecturas/)).toBeTruthy();
  });
});
