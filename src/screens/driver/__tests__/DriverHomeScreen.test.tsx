import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";

const mockApi = {
  trips: jest.fn(), start: jest.fn(), complete: jest.fn(), cancel: jest.fn(), incident: jest.fn(),
};
const mockTracking = { active: jest.fn(), start: jest.fn(), stop: jest.fn() };
const mockLocation = { permission: jest.fn(), watch: jest.fn(), current: jest.fn() };
let mockLocationCallback: ((value: any) => void) | undefined;

jest.mock("../../../services/apiClient", () => ({
  getAssignedDriverTrips: (...args: unknown[]) => mockApi.trips(...args),
  startDriverTrip: (...args: unknown[]) => mockApi.start(...args),
  completeDriverTrip: (...args: unknown[]) => mockApi.complete(...args),
  cancelDriverTrip: (...args: unknown[]) => mockApi.cancel(...args),
  createDriverIncident: (...args: unknown[]) => mockApi.incident(...args),
}));
jest.mock("../../../services/driverLocationService", () => ({
  isDriverTrackingActive: (...args: unknown[]) => mockTracking.active(...args),
  startDriverTracking: (...args: unknown[]) => mockTracking.start(...args),
  stopDriverTracking: (...args: unknown[]) => mockTracking.stop(...args),
}));
jest.mock("expo-location", () => ({
  requestForegroundPermissionsAsync: (...args: unknown[]) => mockLocation.permission(...args),
  watchPositionAsync: (...args: unknown[]) => mockLocation.watch(...args),
  getCurrentPositionAsync: (...args: unknown[]) => mockLocation.current(...args),
  Accuracy: { High: "high" },
}));

import DriverHomeScreen from "../DriverHomeScreen";

const user = { id: "driver-1", email: "driver@test.com", role: "Driver", name: "Carlos" };
const scheduled = { id: "scheduled-1234", status: "Scheduled", departure_time: null, bus_id: null };
const active = { id: "active-123456", status: "In_Progress", departure_time: "invalid", bus_id: "bus-123456" };

describe("DriverHomeScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocationCallback = undefined;
    mockApi.trips.mockResolvedValue([]);
    mockTracking.active.mockResolvedValue(false);
    mockTracking.start.mockResolvedValue(undefined);
    mockTracking.stop.mockResolvedValue(undefined);
    mockApi.start.mockResolvedValue(undefined);
    mockApi.complete.mockResolvedValue(undefined);
    mockApi.cancel.mockResolvedValue(undefined);
    mockApi.incident.mockResolvedValue(undefined);
    mockLocation.permission.mockResolvedValue({ status: "granted" });
    mockLocation.watch.mockImplementation(async (_options, callback) => {
      mockLocationCallback = callback;
      return { remove: jest.fn() };
    });
    mockLocation.current.mockResolvedValue({ coords: { latitude: 9.9, longitude: -84.1 } });
    jest.spyOn(Alert, "alert").mockImplementation(jest.fn());
  });

  it("renders empty assignments and basic actions", async () => {
    const onLogout = jest.fn();
    mockLocation.permission.mockResolvedValueOnce({ status: "denied" });
    const screen = await render(
      <DriverHomeScreen user={user as never} accessToken="jwt" onLogout={onLogout} />,
    );
    expect(screen.getByText("Sin viajes asignados")).toBeTruthy();
    await fireEvent.press(screen.getByText("Salir"));
    expect(onLogout).toHaveBeenCalled();
    expect(mockLocation.watch).not.toHaveBeenCalled();
    await screen.unmount();
  });

  it.each([
    [new Error("Assignments failed"), "Assignments failed"],
    ["unknown", "No se pudieron cargar"],
  ])("shows assignment load errors", async (failure, message) => {
    mockApi.trips.mockRejectedValueOnce(failure);
    const screen = await render(
      <DriverHomeScreen user={{ ...user, name: "" } as never} accessToken="jwt" onLogout={jest.fn()} />,
    );
    expect(screen.getByText(new RegExp(message))).toBeTruthy();
    expect(screen.getByText(/Hola, Conductor/)).toBeTruthy();
    await screen.unmount();
  });

  it("starts an assigned trip and opens the scanner", async () => {
    mockApi.trips.mockResolvedValueOnce([scheduled]).mockResolvedValueOnce([active]);
    const onScanner = jest.fn();
    const screen = await render(
      <DriverHomeScreen user={user as never} accessToken="jwt" onLogout={jest.fn()} onOpenScanner={onScanner} />,
    );
    expect(screen.getByText("Iniciar viaje")).toBeTruthy();
    await fireEvent.press(screen.getByText("Iniciar viaje"));
    await waitFor(() => expect(mockApi.start).toHaveBeenCalledWith("scheduled-1234", "jwt"));
    expect(mockTracking.start).toHaveBeenCalledWith("scheduled-1234", "jwt");
    expect(screen.getByText(/Viaje iniciado/)).toBeTruthy();
    await fireEvent.press(screen.getByText("Escanear Codigo QR"));
    expect(onScanner).toHaveBeenCalled();
    await screen.unmount();
  });

  it.each([
    [new Error("Start failed"), "Start failed"],
    ["unknown", "No se pudo iniciar"],
  ])("recovers when starting a trip fails", async (failure, message) => {
    mockApi.trips.mockResolvedValue([scheduled]);
    mockApi.start.mockRejectedValueOnce(failure);
    const screen = await render(
      <DriverHomeScreen user={user as never} accessToken="jwt" onLogout={jest.fn()} />,
    );
    await fireEvent.press(screen.getByText("Iniciar viaje"));
    await waitFor(() => expect(screen.getByText(new RegExp(message))).toBeTruthy());
    expect(mockTracking.stop).toHaveBeenCalled();
    await screen.unmount();
  });

  it("pauses and resumes active GPS tracking", async () => {
    mockApi.trips.mockResolvedValue([active]);
    mockTracking.active.mockResolvedValue(true);
    const screen = await render(
      <DriverHomeScreen user={user as never} accessToken="jwt" onLogout={jest.fn()} />,
    );
    await fireEvent.press(screen.getByText(/Pausar transmisi/));
    await waitFor(() => expect(mockTracking.stop).toHaveBeenCalled());
    expect(screen.getByText(/Transmisi.*pausada/)).toBeTruthy();
    await fireEvent.press(screen.getByText(/Reanudar transmisi/));
    await waitFor(() => expect(mockTracking.start).toHaveBeenCalledWith("active-123456", "jwt"));
    await screen.unmount();
  });

  it("reports a critical incident while stopped", async () => {
    mockApi.trips.mockResolvedValue([active]);
    const screen = await render(
      <DriverHomeScreen user={user as never} accessToken="jwt" onLogout={jest.fn()} />,
    );
    await fireEvent.press(screen.getByText("Reportar incidente critico"));
    const choices = (Alert.alert as jest.Mock).mock.calls.at(-1)?.[2];
    await act(async () => choices[0].onPress());
    await waitFor(() => expect(mockApi.incident).toHaveBeenCalledWith({
      trip_id: "active-123456",
      type: "Accident",
      description: "Reporte de panico del conductor.",
      latitude: 9.9,
      longitude: -84.1,
    }, "jwt"));
    expect(Alert.alert).toHaveBeenCalledWith("Reporte enviado", expect.any(String));
    await screen.unmount();
  });

  it("finishes and cancels trips after confirmation", async () => {
    mockApi.trips.mockResolvedValue([active]);
    const screen = await render(
      <DriverHomeScreen user={user as never} accessToken="jwt" onLogout={jest.fn()} />,
    );
    await fireEvent.press(screen.getByText("Finalizar viaje"));
    let buttons = (Alert.alert as jest.Mock).mock.calls.at(-1)?.[2];
    await act(async () => buttons[1].onPress());
    await waitFor(() => expect(mockApi.complete).toHaveBeenCalledWith("active-123456", "jwt"));

    await fireEvent.press(screen.getByText("Cancelar viaje"));
    buttons = (Alert.alert as jest.Mock).mock.calls.at(-1)?.[2];
    await act(async () => buttons[1].onPress());
    await waitFor(() => expect(mockApi.cancel).toHaveBeenCalledWith("active-123456", "jwt"));
    await screen.unmount();
  });

  it("updates speed from location and disables panic while moving", async () => {
    mockApi.trips.mockResolvedValue([active]);
    const screen = await render(
      <DriverHomeScreen user={user as never} accessToken="jwt" onLogout={jest.fn()} />,
    );
    await act(async () => mockLocationCallback?.({ coords: { speed: 10 } }));
    expect(screen.getByText(/Bloqueado \(36 km\/h\)/)).toBeTruthy();
    await screen.unmount();
  });
});
