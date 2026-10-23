import { request } from "./apiClient";
import type { SupportCategory, SupportStatus, SupportTicket } from "../types/support";

type TicketResponse = { status: string; data: { ticket: SupportTicket } };
type TicketsResponse = { status: string; results: number; data: { tickets: SupportTicket[] } };

export const supportApi = {
  listForBooking: (bookingId: string, signal?: AbortSignal): Promise<TicketsResponse> =>
    request(`/support-tickets/booking/${encodeURIComponent(bookingId)}`, { signal }),
  create: (payload: {
    bookingId: string;
    category: SupportCategory;
    subject: string;
    message: string;
    priority?: "NORMAL" | "URGENT";
  }): Promise<TicketResponse> => request("/support-tickets", { method: "POST", body: payload }),
  reply: (ticketId: string, message: string): Promise<TicketResponse> =>
    request(`/support-tickets/${encodeURIComponent(ticketId)}/messages`, {
      method: "POST",
      body: { message },
    }),
  updateStatus: (ticketId: string, status: SupportStatus): Promise<TicketResponse> =>
    request(`/support-tickets/${encodeURIComponent(ticketId)}/status`, {
      method: "PATCH",
      body: { status },
    }),
};
