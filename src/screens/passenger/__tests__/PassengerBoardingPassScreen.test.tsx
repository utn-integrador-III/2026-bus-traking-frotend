import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { Alert, Share } from "react-native";

jest.mock("react-native-qrcode-svg", () => {
  const React = require("react");
  return (props: object) => React.createElement("QRCode", { ...props, testID: "qr-code" });
});

import PassengerBoardingPassScreen from "../PassengerBoardingPassScreen";

const baseTicket = {
  id: "ticket-12345678",
  trip_id: "trip-12345678",
  qr_payload: "secure-payload",
  status: "Generated",
  payment_type: "Mock",
  generated_at: "2026-01-01T12:00:00.000Z",
  created_at: "2026-01-01T11:00:00.000Z",
};

describe("PassengerBoardingPassScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, "alert").mockImplementation(jest.fn());
    jest.spyOn(Share, "share").mockResolvedValue({ action: "sharedAction" } as never);
  });

  it("renders and shares a regular ticket", async () => {
    const onHome = jest.fn();
    const onTrip = jest.fn();
    const screen = await render(
      <PassengerBoardingPassScreen ticket={baseTicket as never} onBackHome={onHome} onBackToTrip={onTrip} />,
    );
    expect(screen.getByText("Activo")).toBeTruthy();
    expect(screen.getByText("Mock")).toBeTruthy();
    expect(screen.getByTestId("qr-code").props.value).toBe("secure-payload");
    await fireEvent.press(screen.getByText("Compartir"));
    expect(Share.share).toHaveBeenCalledWith({ message: "secure-payload", title: "Mi boleto BusTrack" });
    await fireEvent.press(screen.getByText("Volver al inicio"));
    await fireEvent.press(screen.getByText("Volver al viaje"));
    expect(onHome).toHaveBeenCalled();
    expect(onTrip).toHaveBeenCalled();
    await screen.unmount();
  });

  it("renders a senior exemption and handles share errors", async () => {
    (Share.share as jest.Mock).mockRejectedValueOnce(new Error("share failed"));
    const senior = { ...baseTicket, payment_type: "Senior_Exemption", generated_at: undefined };
    const screen = await render(
      <PassengerBoardingPassScreen ticket={senior as never} onBackHome={jest.fn()} onBackToTrip={jest.fn()} />,
    );
    expect(screen.getByText("Adulto Mayor")).toBeTruthy();
    expect(screen.getByText("Beneficio transitario verificado")).toBeTruthy();
    await fireEvent.press(screen.getByText("Compartir"));
    await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith("Compartir", expect.any(String)));
    await screen.unmount();
  });
});
