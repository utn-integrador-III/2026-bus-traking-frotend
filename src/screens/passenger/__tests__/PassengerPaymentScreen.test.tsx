import { fireEvent, render, waitFor } from "@testing-library/react-native";

const mockGetTrip = jest.fn();
const mockCheckout = jest.fn();
jest.mock("../../../services/apiClient", () => ({
  getPassengerTripTrackingData: (...args: unknown[]) => mockGetTrip(...args),
}));
jest.mock("../../../services/ticketService", () => ({
  checkoutTicket: (...args: unknown[]) => mockCheckout(...args),
}));

import PassengerPaymentScreen from "../PassengerPaymentScreen";

const trip = {
  id: "trip-1",
  code: "R-01",
  name: "San JosÃ© - Heredia",
  departureTime: "2026-01-01T13:30:00.000Z",
};
const ticket = { id: "ticket-1", trip_id: "trip-1", qr_payload: "qr", status: "Generated" };

describe("PassengerPaymentScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetTrip.mockResolvedValue(trip);
    mockCheckout.mockResolvedValue(ticket);
  });

  it("loads trip data, pays and goes back", async () => {
    const onBack = jest.fn();
    const onSuccess = jest.fn();
    const screen = await render(
      <PassengerPaymentScreen tripId="trip-1" accessToken="jwt" onBack={onBack} onPaymentSuccess={onSuccess} />,
    );
    expect(screen.getByText("R-01")).toBeTruthy();
    await fireEvent.press(screen.getByText(/Pagar/));
    await waitFor(() => expect(mockCheckout).toHaveBeenCalledWith({ trip_id: "trip-1" }, "jwt"));
    expect(onSuccess).toHaveBeenCalledWith(ticket);
    await fireEvent.press(screen.getByText(/â†|←/));
    expect(onBack).toHaveBeenCalled();
    await screen.unmount();
  });

  it("renders senior pricing", async () => {
    const screen = await render(
      <PassengerPaymentScreen tripId="trip-1" accessToken="jwt" isSeniorPassenger onBack={jest.fn()} onPaymentSuccess={jest.fn()} />,
    );
    expect(screen.getByText(/Exenci.*adulto mayor aplicada/)).toBeTruthy();
    expect(screen.getByText("Generar boleto gratis")).toBeTruthy();
    await screen.unmount();
  });

  it.each([
    [new Error("Trip unavailable"), "Trip unavailable"],
    ["unknown", "No se pudo cargar"],
  ])("shows load errors and retries", async (failure, expected) => {
    mockGetTrip.mockRejectedValueOnce(failure).mockResolvedValueOnce(trip);
    const onBack = jest.fn();
    const screen = await render(
      <PassengerPaymentScreen tripId="trip-1" accessToken="jwt" onBack={onBack} onPaymentSuccess={jest.fn()} />,
    );
    expect(screen.getByText(new RegExp(expected))).toBeTruthy();
    await fireEvent.press(screen.getByText("Volver"));
    expect(onBack).toHaveBeenCalled();
    await fireEvent.press(screen.getByText("Intentar de nuevo"));
    await waitFor(() => expect(screen.getByText("R-01")).toBeTruthy());
    await screen.unmount();
  });

  it.each([
    [new Error("Payment failed"), "Payment failed"],
    ["unknown", "No se pudo generar"],
  ])("shows checkout errors", async (failure, expected) => {
    mockCheckout.mockRejectedValueOnce(failure);
    const screen = await render(
      <PassengerPaymentScreen tripId="trip-1" accessToken="jwt" onBack={jest.fn()} onPaymentSuccess={jest.fn()} />,
    );
    await fireEvent.press(screen.getByText(/Pagar/));
    await waitFor(() => expect(screen.getByText(new RegExp(expected))).toBeTruthy());
    await screen.unmount();
  });

  it("falls back for invalid departure dates", async () => {
    mockGetTrip.mockResolvedValueOnce({ ...trip, departureTime: "invalid" });
    const screen = await render(
      <PassengerPaymentScreen tripId="trip-1" accessToken="jwt" onBack={jest.fn()} onPaymentSuccess={jest.fn()} />,
    );
    expect(screen.getByText(/7:00/)).toBeTruthy();
    await screen.unmount();
  });
});
