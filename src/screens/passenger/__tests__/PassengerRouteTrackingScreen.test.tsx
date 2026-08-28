import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";

const mockApi = {
  trip: jest.fn(), eta: jest.fn(), stops: jest.fn(), watch: jest.fn(), incidents: jest.fn(),
};
const mockSupabase = { channel: jest.fn(), remove: jest.fn() };
let mockRealtimeCallbacks: Array<(payload: any) => void> = [];

jest.mock("react-native-maps", () => {
  const React = require("react");
  const { Pressable, View } = require("react-native");
  const Map = ({ children }: any) => React.createElement(View, { testID: "map" }, children);
  const Marker = ({ children, onPress, title }: any) =>
    React.createElement(Pressable, { onPress, testID: title ? `incident-${title}` : undefined }, children);
  Marker.Animated = ({ children }: any) => React.createElement(View, { testID: "bus-marker" }, children);
  class MockAnimatedRegion {
    setValue = jest.fn();
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
  getPassengerTripTrackingData: (...args: unknown[]) => mockApi.trip(...args),
  getTripEtaMinutes: (...args: unknown[]) => mockApi.eta(...args),
  getTripStops: (...args: unknown[]) => mockApi.stops(...args),
  watchStop: (...args: unknown[]) => mockApi.watch(...args),
  getMapIncidents: (...args: unknown[]) => mockApi.incidents(...args),
}));
jest.mock("../../../lib/supabase", () => ({
  supabase: {
    channel: (...args: unknown[]) => mockSupabase.channel(...args),
    removeChannel: (...args: unknown[]) => mockSupabase.remove(...args),
  },
}));

import PassengerRouteTrackingScreen from "../PassengerRouteTrackingScreen";

const tripData = {
  tripId: "trip-123456",
  routeId: "route-1",
  code: "R-01",
  name: "San Jose - Heredia",
  origin: "San Jose",
  destination: "Heredia",
  status: "In_Progress",
  speedKmh: 15,
  driverName: "Carlos",
  busPlate: "BUS-01",
  estimatedArrivalMinutes: 8,
  geojson: {
    type: "Feature",
    geometry: {
      type: "LineString",
      coordinates: [[-84.1, 9.9], [-84.09, 9.91], [-84.08, 9.92]],
    },
  },
};
const stops = [
  { id: "stop-a", name: "Central", latitude: 9.9, longitude: -84.1, stop_order: 1 },
  { id: "stop-b", name: "Second", latitude: 9.91, longitude: -84.09, stop_order: 2 },
  { id: "stop-c", name: "Final", latitude: 9.92, longitude: -84.08, stop_order: 3 },
];

describe("PassengerRouteTrackingScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRealtimeCallbacks = [];
    mockApi.trip.mockResolvedValue(tripData);
    mockApi.eta.mockResolvedValue(3);
    mockApi.stops.mockResolvedValue(stops);
    mockApi.watch.mockResolvedValue({ stop_id: "stop-b" });
    mockApi.incidents.mockResolvedValue([
      { id: "i1", trip_id: "trip-123456", type: "Delay", description: "Traffic", latitude: 9.91, longitude: -84.09 },
    ]);
    const channel: any = {
      on: jest.fn((_type, _filter, callback) => {
        mockRealtimeCallbacks.push(callback);
        return channel;
      }),
      subscribe: jest.fn(() => channel),
    };
    mockSupabase.channel.mockReturnValue(channel);
    jest.spyOn(Alert, "alert").mockImplementation(jest.fn());
  });

  function renderTracking(extra: object = {}) {
    return render(
      <PassengerRouteTrackingScreen
        tripId="trip-123456"
        accessToken="jwt"
        onBack={jest.fn()}
        onCheckout={jest.fn()}
        {...extra}
      />,
    );
  }

  it.each([
    [new Error("Tracking failed"), "Tracking failed"],
    ["unknown", "No se pudo cargar"],
  ])("shows trip loading errors", async (failure, expected) => {
    mockApi.trip.mockRejectedValueOnce(failure);
    const onBack = jest.fn();
    const screen = await renderTracking({ onBack });
    expect(screen.getByText(new RegExp(expected))).toBeTruthy();
    await fireEvent.press(screen.getByText("Volver"));
    expect(onBack).toHaveBeenCalled();
    await screen.unmount();
  });

  it("renders tracking data, incidents and primary actions", async () => {
    const onBack = jest.fn();
    const onCheckout = jest.fn();
    const onIncident = jest.fn();
    const screen = await renderTracking({ onBack, onCheckout, onOpenIncidentReport: onIncident });
    expect(screen.getByText("Ruta R-01")).toBeTruthy();
    expect(screen.getByText("In Progress")).toBeTruthy();
    await waitFor(() => expect(screen.getByTestId("incident-Delay")).toBeTruthy());
    await fireEvent.press(screen.getByText("Comprar boleto"));
    await fireEvent.press(screen.getByText("Reportar incidente en la ruta"));
    await fireEvent.press(screen.getByText("Confirmar abordaje"));
    expect(screen.getByText("Abordaste")).toBeTruthy();
    expect(onCheckout).toHaveBeenCalled();
    expect(onIncident).toHaveBeenCalled();

    await fireEvent.press(screen.getByText("Cancelar rastreo"));
    const buttons = (Alert.alert as jest.Mock).mock.calls.at(-1)?.[2];
    await act(async () => buttons[1].onPress());
    expect(onBack).toHaveBeenCalled();
    await screen.unmount();
    expect(mockSupabase.remove).toHaveBeenCalled();
  });

  it("selects registered stops and resets to boarding", async () => {
    const screen = await renderTracking();
    await waitFor(() => expect(screen.getByText("P1")).toBeTruthy());
    await fireEvent.press(screen.getByText("P1"));
    await waitFor(() => expect(mockApi.watch).toHaveBeenCalledWith("trip-123456", "stop-b", "jwt"));
    expect(screen.getByText("Second")).toBeTruthy();
    await fireEvent.press(screen.getByText("Volver a parada de abordaje"));
    await waitFor(() => expect(mockApi.watch).toHaveBeenCalledWith("trip-123456", "stop-a", "jwt"));
    await screen.unmount();
  });

  it.each([
    [new Error("Stop failed"), "Stop failed"],
    ["unknown", "No se pudo registrar"],
  ])("shows stop selection failures", async (failure, expected) => {
    mockApi.watch.mockRejectedValueOnce(failure);
    const screen = await renderTracking();
    await waitFor(() => expect(screen.getByText("P1")).toBeTruthy());
    await fireEvent.press(screen.getByText("P1"));
    await waitFor(() => expect(screen.getByText(new RegExp(expected))).toBeTruthy());
    await screen.unmount();
  });

  it("uses approximate stops when route stops are unavailable", async () => {
    mockApi.trip.mockResolvedValueOnce({ ...tripData, routeId: null, status: "Scheduled" });
    const screen = await renderTracking();
    expect(screen.getByText("Scheduled")).toBeTruthy();
    expect(screen.getByText(/Paradas aproximadas/)).toBeTruthy();
    await fireEvent.press(screen.getByText("P1"));
    expect(screen.getByText(/Esta parada es aproximada/)).toBeTruthy();
    await screen.unmount();
  });

  it("updates realtime position, ETA and delayed status", async () => {
    const screen = await renderTracking();
    await waitFor(() => expect(mockRealtimeCallbacks).toHaveLength(2));
    await act(async () => mockRealtimeCallbacks[0]({ payload: {
      latitude: 9.9,
      longitude: -84.1,
      speed_kmh: 25,
      status: "Delayed",
      recorded_at: "2026-01-01T12:00:00.000Z",
    } }));
    await waitFor(() => expect(mockApi.eta).toHaveBeenCalled());
    expect(screen.getByText("Delayed")).toBeTruthy();
    expect(screen.getByText("25")).toBeTruthy();
    expect(screen.getByText("3 min")).toBeTruthy();
    await act(async () => mockRealtimeCallbacks[1]({ new: { lat: 9.91, lng: -84.09, status: "Stopped" } }));
    expect(screen.getByText("Stopped")).toBeTruthy();
    await screen.unmount();
  });

  it("survives incident and stop API failures", async () => {
    mockApi.stops.mockRejectedValueOnce(new Error("stops"));
    mockApi.incidents.mockRejectedValueOnce(new Error("incidents"));
    const screen = await renderTracking();
    await waitFor(() => expect(screen.getByText(/Paradas aproximadas/)).toBeTruthy());
    await screen.unmount();
  });
});
