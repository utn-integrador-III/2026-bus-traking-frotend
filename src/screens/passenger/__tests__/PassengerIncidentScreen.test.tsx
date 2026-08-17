import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";

const mockRequestPermission = jest.fn();
const mockGetPosition = jest.fn();
const mockCreateIncident = jest.fn();

jest.mock("expo-location", () => ({
  requestForegroundPermissionsAsync: (...args: unknown[]) => mockRequestPermission(...args),
  getCurrentPositionAsync: (...args: unknown[]) => mockGetPosition(...args),
  Accuracy: { High: "high" },
}));
jest.mock("../../../services/apiClient", () => ({
  createPassengerIncident: (...args: unknown[]) => mockCreateIncident(...args),
}));

import PassengerIncidentScreen from "../PassengerIncidentScreen";

describe("PassengerIncidentScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, "alert").mockImplementation(jest.fn());
    mockRequestPermission.mockResolvedValue({ status: "granted" });
    mockGetPosition.mockResolvedValue({ coords: { latitude: 9.93, longitude: -84.08 } });
    mockCreateIncident.mockResolvedValue({ id: "incident-1" });
  });

  it("shows a location permission error and handles back", async () => {
    mockRequestPermission.mockResolvedValueOnce({ status: "denied" });
    const onBack = jest.fn();
    const screen = await render(
      <PassengerIncidentScreen tripId="trip" accessToken="jwt" onBack={onBack} onSubmitted={jest.fn()} />,
    );
    await waitFor(() => expect(screen.getByText(/Se requiere acceso/)).toBeTruthy());
    await fireEvent.press(screen.getByText(/Volver/));
    expect(onBack).toHaveBeenCalled();
    await screen.unmount();
  });

  it("validates type and unavailable coordinates", async () => {
    mockGetPosition.mockImplementation(() => new Promise(() => undefined));
    const screen = await render(
      <PassengerIncidentScreen tripId="trip" accessToken="jwt" onBack={jest.fn()} onSubmitted={jest.fn()} />,
    );
    await fireEvent.press(screen.getByText("Enviar reporte"));
    expect(Alert.alert).toHaveBeenCalledWith("Tipo requerido", expect.any(String));
    await fireEvent.press(screen.getByText("Accidente"));
    await fireEvent.press(screen.getByText("Enviar reporte"));
    expect(Alert.alert).toHaveBeenCalledWith("Ubicacion no disponible", expect.any(String));
    await screen.unmount();
  });

  it("submits a selected incident with trimmed/default description", async () => {
    const onSubmitted = jest.fn();
    const screen = await render(
      <PassengerIncidentScreen tripId="trip-1" accessToken="jwt" onBack={jest.fn()} onSubmitted={onSubmitted} />,
    );
    await waitFor(() => expect(screen.getByText(/Ubicacion capturada/)).toBeTruthy());
    await fireEvent.press(screen.getByText("Demora"));
    const input = screen.getByPlaceholderText("Describe lo que observas...");
    await fireEvent.changeText(input, "   ");
    await fireEvent.press(screen.getByText("Enviar reporte"));

    await waitFor(() => expect(mockCreateIncident).toHaveBeenCalledWith({
      trip_id: "trip-1",
      type: "Delay",
      description: "Sin descripcion",
      latitude: 9.93,
      longitude: -84.08,
    }, "jwt"));
    const buttons = (Alert.alert as jest.Mock).mock.calls.at(-1)?.[2];
    buttons[0].onPress();
    expect(onSubmitted).toHaveBeenCalled();
    await screen.unmount();
  });

  it.each([
    [new Error("Server down"), "Server down"],
    ["unknown", "Error al enviar el reporte."],
  ])("shows submission errors", async (failure, expected) => {
    mockCreateIncident.mockRejectedValueOnce(failure);
    const screen = await render(
      <PassengerIncidentScreen tripId="trip" accessToken="jwt" onBack={jest.fn()} onSubmitted={jest.fn()} />,
    );
    await waitFor(() => expect(screen.getByText(/Ubicacion capturada/)).toBeTruthy());
    await fireEvent.press(screen.getByText("Otro"));
    await fireEvent.changeText(screen.getByPlaceholderText("Describe lo que observas..."), "detalle");
    await fireEvent.press(screen.getByText("Enviar reporte"));
    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith("Error", expect.stringContaining(expected)),
    );
    await screen.unmount();
  });
});
