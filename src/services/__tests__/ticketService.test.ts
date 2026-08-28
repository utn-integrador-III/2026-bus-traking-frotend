const mockApiRequest = jest.fn();

jest.mock("../apiClient", () => ({
  apiRequest: (...args: unknown[]) => mockApiRequest(...args),
}));

import { checkoutTicket, getMyTickets, scanTicket } from "../ticketService";

describe("ticketService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("solicita el checkout autenticado", async () => {
    const ticket = { id: "ticket-1" };
    mockApiRequest.mockResolvedValueOnce(ticket);

    await expect(checkoutTicket({ trip_id: "trip-1" }, "token")).resolves.toBe(ticket);
    expect(mockApiRequest).toHaveBeenCalledWith("/tickets/checkout", {
      method: "POST",
      body: { trip_id: "trip-1" },
      token: "token",
    });
  });

  it("lista los boletos del pasajero", async () => {
    mockApiRequest.mockResolvedValueOnce([]);

    await expect(getMyTickets("token")).resolves.toEqual([]);
    expect(mockApiRequest).toHaveBeenCalledWith("/tickets/my", {
      method: "GET",
      token: "token",
    });
  });

  it("envía el identificador correcto al escanear", async () => {
    mockApiRequest.mockResolvedValueOnce({ id: "ticket-1", status: "Scanned" });

    await scanTicket("ticket-1", "token");
    expect(mockApiRequest).toHaveBeenCalledWith("/tickets/scan", {
      method: "POST",
      body: { ticket_id: "ticket-1" },
      token: "token",
    });
  });
});
