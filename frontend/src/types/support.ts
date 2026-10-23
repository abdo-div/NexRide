export type SupportCategory =
  | "BOOKING_CHANGE"
  | "PAYMENT"
  | "PICKUP_RETURN"
  | "VEHICLE"
  | "REFUND"
  | "OTHER";

export type SupportStatus =
  | "OPEN"
  | "WAITING_FOR_CUSTOMER"
  | "IN_PROGRESS"
  | "RESOLVED"
  | "CLOSED";

export interface SupportTicket {
  _id: string;
  reference: string;
  bookingId: string;
  category: SupportCategory;
  subject: string;
  status: SupportStatus;
  priority: "NORMAL" | "URGENT";
  messages: Array<{
    _id: string;
    authorRole: "customer" | "company" | "admin";
    body: string;
    sentAt: string;
  }>;
  lastMessageAt: string;
  createdAt: string;
}
