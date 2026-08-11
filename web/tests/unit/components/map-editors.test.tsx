import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ instances: [] as any[], source: { setData: vi.fn() } }));
vi.mock("maplibre-gl", () => {
  class Map {
    events: Record<string, (...args: any[]) => void> = {};
    addControl = vi.fn(); addSource = vi.fn(); addLayer = vi.fn();
    fitBounds = vi.fn(); easeTo = vi.fn(); remove = vi.fn();
    getSource = vi.fn(() => mocks.source); getZoom = vi.fn(() => 10);
    constructor() { mocks.instances.push(this); }
    on(event: string, callback: (...args: any[]) => void) { this.events[event] = callback; return this; }
  }
  return { Map, NavigationControl: class NavigationControl {} };
});

import { RouteGeometryEditor } from "@/components/admin/route-geometry-editor";
import { RouteMap } from "@/components/admin/route-map";
import { StopLocationPicker } from "@/components/admin/stop-location-picker";

describe("MapLibre editors", () => {
  beforeEach(() => {
    mocks.instances.length = 0;
    vi.clearAllMocks();
  });

  async function loadMap(index = 0) {
    await waitFor(() => expect(mocks.instances.length).toBeGreaterThan(index));
    act(() => mocks.instances[index].events.load());
  }

  it("draws, updates, undoes and clears route geometry", async () => {
    const onChange = vi.fn();
    const { rerender, unmount } = render(<RouteGeometryEditor value={null} onChange={onChange} />);
    expect(screen.getByText(/clic en el mapa/)).toBeTruthy();
    await loadMap();
    act(() => mocks.instances[0].events.click({ lngLat: { lng: -84.1, lat: 9.9 } }));
    expect(onChange).toHaveBeenCalledWith({ type: "LineString", coordinates: [[-84.1, 9.9]] });

    const line = { type: "LineString" as const, coordinates: [[-84.1, 9.9], [-84.2, 10]] as [number, number][] };
    rerender(<RouteGeometryEditor value={line} onChange={onChange} />);
    await waitFor(() => expect(mocks.source.setData).toHaveBeenCalled());
    expect(mocks.instances[0].fitBounds).toHaveBeenCalled();
    fireEvent.click(screen.getByText("Deshacer"));
    expect(onChange).toHaveBeenCalledWith({ type: "LineString", coordinates: [[-84.1, 9.9]] });
    fireEvent.click(screen.getByText("Limpiar"));
    expect(onChange).toHaveBeenCalledWith(null);
    unmount();
    expect(mocks.instances[0].remove).toHaveBeenCalled();
  });

  it("selects and clears a stop location", async () => {
    const onChange = vi.fn();
    const { rerender, unmount } = render(<StopLocationPicker value={null} onChange={onChange} />);
    expect(screen.getByText(/clic en el mapa/)).toBeTruthy();
    await loadMap();
    act(() => mocks.instances[0].events.click({ lngLat: { lng: -84.1, lat: 9.9 } }));
    expect(onChange).toHaveBeenCalledWith({ lat: 9.9, lng: -84.1 });
    rerender(<StopLocationPicker value={{ lat: 9.9, lng: -84.1 }} onChange={onChange} geofenceMeters={100} />);
    await waitFor(() => expect(mocks.source.setData).toHaveBeenCalled());
    expect(mocks.instances[0].easeTo).toHaveBeenCalledWith({ center: [-84.1, 9.9], zoom: 14 });
    expect(screen.getByText(/Latitud 9.900000/)).toBeTruthy();
    fireEvent.click(screen.getByText("Quitar"));
    expect(onChange).toHaveBeenCalledWith(null);
    unmount();
  });

  it("renders empty, selectable and suspicious route maps", async () => {
    const { rerender, unmount } = render(<RouteMap routes={[]} />);
    expect(screen.getByText(/Ninguna ruta/)).toBeTruthy();
    const normal = { id: "r1", name: "Normal", origin: "A", destination: "B", is_active: true, geometry_geojson: { type: "LineString", coordinates: [[-84.1, 9.9], [-84.2, 10]] } };
    rerender(<RouteMap routes={[normal as never]} />);
    await loadMap();
    expect(mocks.instances[0].addSource).toHaveBeenCalled();
    fireEvent.click(screen.getByText("Normal"));
    await waitFor(() => expect(screen.getByText(/A.*B/)).toBeTruthy());
    fireEvent.click(screen.getByText("Todas"));

    const suspicious = { ...normal, id: "r2", name: "Huge", geometry_geojson: { type: "LineString", coordinates: [[-84, 9], [84, -9]] } };
    rerender(<RouteMap routes={[normal as never, suspicious as never]} />);
    expect(screen.getByText(/superan|mide/)).toBeTruthy();
    unmount();
  });
});
