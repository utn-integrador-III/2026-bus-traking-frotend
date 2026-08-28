import { fireEvent, render, waitFor } from "@testing-library/react-native";

const mockGetTickets = jest.fn();
jest.mock("../../../services/ticketService", () => ({
  getMyTickets: (...args: unknown[]) => mockGetTickets(...args),
}));

import PassengerMyTicketsScreen from "../PassengerMyTicketsScreen";

const ticket = {
  id: "ticket-1",
  trip_id: "abcdefgh-1234",
  qr_code: "qr",
  status: "Generated",
  generated_at: "2026-01-01T12:00:00.000Z",
  created_at: "2025-12-31T12:00:00.000Z",
};

describe("PassengerMyTicketsScreen", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders loading then an empty state and handles back", async () => {
    mockGetTickets.mockResolvedValueOnce([]);
    const onBack = jest.fn();
    const screen = await render(
      <PassengerMyTicketsScreen accessToken="jwt" onBack={onBack} onOpenTicket={jest.fn()} />,
    );
    expect(screen.getByText(/no ten/)).toBeTruthy();
    await fireEvent.press(screen.getByText("Inicio"));
    expect(onBack).toHaveBeenCalled();
  });

  it("lists tickets and opens the selected QR", async () => {
    mockGetTickets.mockResolvedValueOnce([
      ticket,
      { ...ticket, id: "ticket-2", status: "Used", generated_at: undefined },
    ]);
    const onOpen = jest.fn();
    const screen = await render(
      <PassengerMyTicketsScreen accessToken="jwt" onBack={jest.fn()} onOpenTicket={onOpen} />,
    );
    await waitFor(() => expect(screen.getByText("Boleto #2")).toBeTruthy());
    expect(screen.getByText("Activo")).toBeTruthy();
    expect(screen.getByText("Used")).toBeTruthy();
    await fireEvent.press(screen.getAllByText("Ver QR")[0]);
    expect(onOpen).toHaveBeenCalledWith(ticket);
  });

  it.each([
    [new Error("Sin conexiÃ³n"), "Sin conexiÃ³n"],
    ["unknown", "No se pudieron cargar tus boletos."],
  ])("shows errors and retries", async (failure, expected) => {
    mockGetTickets.mockRejectedValueOnce(failure).mockResolvedValueOnce([]);
    const screen = await render(
      <PassengerMyTicketsScreen accessToken="jwt" onBack={jest.fn()} onOpenTicket={jest.fn()} />,
    );
    await waitFor(() => expect(screen.getByText(expected)).toBeTruthy());
    await fireEvent.press(screen.getByText("Intentar de nuevo"));
    await waitFor(() => expect(mockGetTickets).toHaveBeenCalledTimes(2));
  });
});
