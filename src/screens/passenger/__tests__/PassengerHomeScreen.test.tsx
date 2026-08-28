import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";

const mockApi = { trips: jest.fn(), stops: jest.fn(), watch: jest.fn() };
const mockSupabase = { channel: jest.fn(), remove: jest.fn() };
let mockRealtimeCallback: ((payload: any) => void) | undefined;
const mockAnimate = jest.fn();

jest.mock("react-native-maps", () => {
  const React = require("react");
  const { Pressable, View } = require("react-native");
  const Map = React.forwardRef(({ children }: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({ animateToRegion: mockAnimate }));
    return React.createElement(View, { testID: "map" }, children);
  });
  const Marker = ({ children, onPress }: any) =>
    React.createElement(Pressable, { onPress }, children);
  Marker.Animated = ({ children }: any) => React.createElement(View, { testID: "live-marker" }, children);
  class MockAnimatedRegion {
    timing() { return { start: jest.fn() }; }
  }
  return {
    __esModule: true,
    default: Map,
    Marker,
    Polyline: (props: any) => React.createElement(View, { ...props, testID: "polyline" }),
    AnimatedRegion: MockAnimatedRegion,
  };
});
jest.mock("../../../services/apiClient", () => ({
  getPassengerHomeTripsPreview: (...args: unknown[]) => mockApi.trips(...args),
  getTripStops: (...args: unknown[]) => mockApi.stops(...args),
  watchStop: (...args: unknown[]) => mockApi.watch(...args),
}));
jest.mock("../../../lib/supabase", () => ({
  supabase: {
    channel: (...args: unknown[]) => mockSupabase.channel(...args),
    removeChannel: (...args: unknown[]) => mockSupabase.remove(...args),
  },
}));

import PassengerHomeScreen from "../PassengerHomeScreen";

const user = { id: "p1", email: "passenger@test.com", role: "Passenger", name: "Andrea" };
const routeGeo = JSON.stringify({
  type: "Feature",
  geometry: { type: "LineString", coordinates: [[-84.1, 9.9], [-84.09, 9.91], [-84.08, 9.92]] },
});
const trip = {
  tripId: "trip-123456",
  routeId: "route-1",
  code: "R-01",
  name: "San Jose - Heredia",
  origin: "San Jose",
  destination: "Heredia",
  status: "In_Progress",
  badgeText: "En curso",
  etaText: "10 min",
  geojson: routeGeo,
};
const stops = [
  { id: "stop-a", name: "Central", latitude: 9.9, longitude: -84.1, stop_order: 1 },
  { id: "stop-b", name: "Final", latitude: 9.92, longitude: -84.08, stop_order: 2 },
];

describe("PassengerHomeScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRealtimeCallback = undefined;
    mockApi.trips.mockResolvedValue([]);
    mockApi.stops.mockResolvedValue(stops);
    mockApi.watch.mockResolvedValue({ stop_id: "stop-a" });
    const channel: any = {
      on: jest.fn((_type, _filter, callback) => {
        mockRealtimeCallback = callback;
        return channel;
      }),
      subscribe: jest.fn(() => channel),
    };
    mockSupabase.channel.mockReturnValue(channel);
    jest.spyOn(Alert, "alert").mockImplementation(jest.fn());
  });

  function renderHome(extra: object = {}) {
    return render(
      <PassengerHomeScreen
        user={user as never}
        accessToken="jwt"
        onLogout={jest.fn()}
        onTrackTrip={jest.fn()}
        onOpenTickets={jest.fn()}
        {...extra}
      />,
    );
  }

  it("renders empty and error states and retries", async () => {
    const empty = await renderHome();
    expect(empty.getByText("No hay viajes visibles")).toBeTruthy();
    await empty.unmount();

    mockApi.trips.mockRejectedValueOnce(new Error("Trips failed")).mockResolvedValueOnce([]);
    const failed = await renderHome();
    expect(failed.getByText("Trips failed")).toBeTruthy();
    await fireEvent.press(failed.getByText("Intentar de nuevo"));
    await waitFor(() => expect(mockApi.trips).toHaveBeenCalledTimes(3));
    await failed.unmount();
  });

  it("selects a trip, registers a stop and opens tracking", async () => {
    mockApi.trips.mockResolvedValue([trip]);
    const onTrack = jest.fn();
    const onTickets = jest.fn();
    const onLogout = jest.fn();
    const screen = await renderHome({ onTrackTrip: onTrack, onOpenTickets: onTickets, onLogout });
    await fireEvent.press(screen.getByText("San Jose - Heredia"));
    await waitFor(() => expect(screen.getByTestId("map")).toBeTruthy());
    expect(mockApi.stops).toHaveBeenCalledWith("route-1", "jwt");
    await waitFor(() => expect(screen.getByText("Abordaje")).toBeTruthy());
    await fireEvent.press(screen.getByText("Abordaje"));
    await waitFor(() => expect(mockApi.watch).toHaveBeenCalledWith("trip-123456", "stop-a", "jwt"));
    await fireEvent.press(screen.getByText("Ver tracking"));
    await fireEvent.press(screen.getByText("Boletos"));
    await fireEvent.press(screen.getByText("Salir"));
    expect(onTrack).toHaveBeenCalledWith("trip-123456");
    expect(onTickets).toHaveBeenCalled();
    expect(onLogout).toHaveBeenCalled();
    await screen.unmount();
    expect(mockSupabase.remove).toHaveBeenCalled();
  });

  it.each([
    [new Error("Watch failed"), "Watch failed"],
    ["unknown", "No se pudo registrar"],
  ])("shows stop watch errors", async (failure, expected) => {
    mockApi.trips.mockResolvedValue([trip]);
    mockApi.watch.mockRejectedValueOnce(failure);
    const screen = await renderHome();
    await fireEvent.press(screen.getByText("San Jose - Heredia"));
    await waitFor(() => expect(screen.getByText("Abordaje")).toBeTruthy());
    await fireEvent.press(screen.getByText("Abordaje"));
    await waitFor(() => expect(screen.getByText(new RegExp(expected))).toBeTruthy());
    await screen.unmount();
  });

  it("uses approximate route stops when the API has none", async () => {
    mockApi.trips.mockResolvedValue([{ ...trip, routeId: null, status: "Delayed" }]);
    const screen = await renderHome();
    await fireEvent.press(screen.getByText("San Jose - Heredia"));
    await waitFor(() => expect(screen.getByText(/Paradas aproximadas/)).toBeTruthy());
    await fireEvent.press(screen.getByText("Abordaje"));
    expect(screen.getByText(/Esta parada es aproximada/)).toBeTruthy();
    await screen.unmount();
  });

  it("renders realtime bus positions and reports a missed boarding point", async () => {
    mockApi.trips.mockResolvedValue([{ ...trip, routeId: null }]);
    const screen = await renderHome();
    await fireEvent.press(screen.getByText("San Jose - Heredia"));
    await waitFor(() => expect(mockRealtimeCallback).toBeDefined());
    await act(async () => mockRealtimeCallback?.({ payload: { latitude: 9.9, longitude: -84.1 } }));
    expect(screen.getByTestId("live-marker")).toBeTruthy();
    await act(async () => mockRealtimeCallback?.({ new: { lat: 10.1, lng: -84.5, speed: 20 } }));
    expect(Alert.alert).toHaveBeenCalledWith("Bus perdido", expect.any(String), expect.any(Array), { cancelable: false });
    const buttons = (Alert.alert as jest.Mock).mock.calls.at(-1)?.[2];
    await act(async () => buttons[0].onPress());
    await screen.unmount();
  });

  it("clears an externally tracked trip", async () => {
    mockApi.trips.mockResolvedValue([{ ...trip, status: "Scheduled" }]);
    const onClear = jest.fn();
    const screen = await renderHome({ trackingTripId: "trip-123456", onClearTracking: onClear });
    await waitFor(() => expect(screen.getByText("Dejar de seguir")).toBeTruthy());
    await fireEvent.press(screen.getByText("Dejar de seguir"));
    expect(onClear).toHaveBeenCalled();
    await screen.unmount();
  });
});
