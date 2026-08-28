import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

const mockScan = jest.fn();
const mockRequestPermission = jest.fn();
let mockPermission: { granted: boolean } | null = { granted: true };

jest.mock("expo-camera", () => {
  const React = require("react");
  return {
    useCameraPermissions: () => [mockPermission, mockRequestPermission],
    CameraView: (props: object) => React.createElement("CameraView", { ...props, testID: "camera" }),
  };
});
jest.mock("../../../services/ticketService", () => ({
  scanTicket: (...args: unknown[]) => mockScan(...args),
}));
jest.mock("@expo/vector-icons", () => {
  const React = require("react");
  return { Feather: (props: object) => React.createElement("Feather", props) };
});

import DriverScannerScreen from "../DriverScannerScreen";

function encode(payload: object) {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

describe("DriverScannerScreen", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockPermission = { granted: true };
    mockScan.mockResolvedValue({});
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it("renders loading and permission states", async () => {
    mockPermission = null;
    const loading = await render(<DriverScannerScreen accessToken="jwt" onBack={jest.fn()} />);
    expect(loading.getByText(/Solicitando permisos/)).toBeTruthy();
    await loading.unmount();

    mockPermission = { granted: false };
    const onBack = jest.fn();
    const denied = await render(<DriverScannerScreen accessToken="jwt" onBack={onBack} />);
    await fireEvent.press(denied.getByText("Dar permiso"));
    await fireEvent.press(denied.getByText("Volver"));
    expect(mockRequestPermission).toHaveBeenCalled();
    expect(onBack).toHaveBeenCalled();
    await denied.unmount();
  });

  it("scans a valid QR and prevents duplicate scans", async () => {
    const screen = await render(<DriverScannerScreen accessToken="jwt" onBack={jest.fn()} />);
    const camera = screen.getByTestId("camera");
    const event = { nativeEvent: { data: encode({ ticket_id: "ticket-1" }) } };
    await fireEvent(camera, "barcodeScanned", event.nativeEvent);
    await fireEvent(camera, "barcodeScanned", event.nativeEvent);

    await waitFor(() => expect(mockScan).toHaveBeenCalledWith("ticket-1", "jwt"));
    expect(mockScan).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Boleto escaneado correctamente.")).toBeTruthy();

    await act(async () => jest.advanceTimersByTime(2500));
    await screen.unmount();
  });

  it.each([
    [encode({}), "El QR no contiene"],
    ["not-json", "Unexpected"],
  ])("shows invalid QR errors", async (data, message) => {
    const screen = await render(<DriverScannerScreen accessToken="jwt" onBack={jest.fn()} />);
    await fireEvent(screen.getByTestId("camera"), "barcodeScanned", { data });
    await waitFor(() => expect(screen.getByText(new RegExp(message))).toBeTruthy());
    await screen.unmount();
  });

  it("shows service errors and returns to the driver home", async () => {
    mockScan.mockRejectedValueOnce(new Error("Boleto usado"));
    const onBack = jest.fn();
    const screen = await render(<DriverScannerScreen accessToken="jwt" onBack={onBack} />);
    await fireEvent.press(screen.getByText("Volver"));
    await fireEvent(screen.getByTestId("camera"), "barcodeScanned", {
      data: encode({ ticket_id: "ticket-2" }),
    });
    await waitFor(() => expect(screen.getByText("Boleto usado")).toBeTruthy());
    expect(onBack).toHaveBeenCalled();
    await screen.unmount();
  });
});
