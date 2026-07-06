import { apiRequest } from "./apiClient";

export interface CheckoutTicketRequest {
  trip_id: string;
}

export interface Ticket {
  id: string;
  passenger_id: string;
  trip_id: string;
  status: "Generated" | string;
  payment_type?: "Mock" | string;
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