import { apiRequest } from "./apiClient";

export interface CheckoutTicketRequest {
  trip_id: string;
}

export interface Ticket {
  id: string;
  passenger_id: string;
  trip_id: string;
  status: "Generated" | string;
  payment_type?: "Mock" | "Senior_Exemption" | string;
  generated_at?: string;
  scanned_at?: string | null;
  qr_token?: string | null;
  scanned_by?: string | null;
  qr_payload: string;
  created_at: string;
}

export async function checkoutTicket(
  payload: CheckoutTicketRequest,
  token: string,
): Promise<Ticket> {
  return apiRequest<Ticket>("/tickets/checkout", {
    method: "POST",
    body: payload,
    token,
  });
}

export async function getMyTickets(token: string): Promise<Ticket[]> {
  return apiRequest<Ticket[]>("/tickets/my", {
    method: "GET",
    token,
  });
}

export async function scanTicket(
  ticketId: string,
  token: string,
): Promise<Ticket> {
  return apiRequest<Ticket>("/tickets/scan", {
    method: "POST",
    body: { ticket_id: ticketId },
    token,
  });
}