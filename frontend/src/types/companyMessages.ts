import type { PaginationMeta } from "./admin";

export type MessageChannel =
  | "INQUIRY"
  | "ACTIVE_BOOKING"
  | "POST_RENTAL_SUPPORT";

export type ConversationStatus = "OPEN" | "RESOLVED" | "ARCHIVED";

export type MessageSenderRole = "CUSTOMER" | "AGENT" | "SYSTEM";

export type MessageKind = "TEXT" | "SYSTEM";

/** The tenant whose Messages inbox this is (from the session). */
export interface CompanyMessagesCompany {
  name: string;
  slug: string;
}

/** KPI ribbon recomputed from the tenant's real conversations + reviews. */
export interface CompanyMessagesSummary {
  total: number;
  active: number;
  unreadConversations: number;
  unreadMessages: number;
  avgFirstReplyMinutes: number | null;
  satisfactionPct: number | null;
  satisfactionAvg: number | null;
}

/** Quick-filter counts for the inbox badge row. */
export interface CompanyMessagesFilters {
  total: number;
  needsReply: number;
  activeRentals: number;
  postRental: number;
}

export interface CompanyConversationCustomer {
  id: string | null;
  name: string;
  initials: string;
  photo: string | null;
  phoneNumber: string | null;
}

export interface CompanyConversationVehicle {
  make: string | null;
  model: string | null;
  year: number | null;
  photo: string | null;
}

export interface CompanyConversationBooking {
  reference: string;
  status: string | null;
  pickupMethod: string;
  pickupLocation: string | null;
  startDate: string | null;
  endDate: string | null;
  totalAmount: number | null;
  vehicle: CompanyConversationVehicle | null;
}

export interface CompanyConversationLastMessage {
  preview: string;
  at: string | null;
  sender: "customer" | "agent" | "system";
}

/** One row of the conversation directory. */
export interface CompanyConversation {
  id: string;
  subject: string;
  channel: MessageChannel;
  status: ConversationStatus;
  unreadForCompany: number;
  lastMessage: CompanyConversationLastMessage;
  createdAt: string | null;
  customer: CompanyConversationCustomer;
  booking: CompanyConversationBooking | null;
}

/** One event in a conversation thread. */
export interface CompanyChatMessage {
  id: string;
  senderRole: MessageSenderRole;
  senderName: string;
  body: string;
  kind: MessageKind;
  createdAt: string | null;
}

export interface CompanyConversationThread {
  conversation: CompanyConversation;
  messages: CompanyChatMessage[];
}

/** Full payload of GET /companies/conversations. */
export interface CompanyMessagesData {
  company: CompanyMessagesCompany | null;
  summary: CompanyMessagesSummary;
  filters: CompanyMessagesFilters;
  conversations: CompanyConversation[];
  pagination: PaginationMeta;
}

export type CompanyMessagesView =
  | "all"
  | "needsReply"
  | "activeRentals"
  | "postRental";

export type CompanyMessagesChannelFilter = "all" | MessageChannel;

/** Client-side filter state mapped onto the backend query string. */
export interface CompanyMessagesQuery {
  view: CompanyMessagesView;
  channel: CompanyMessagesChannelFilter;
  q: string;
  page: number;
  limit: number;
}
