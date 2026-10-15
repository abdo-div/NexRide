import { request } from "./apiClient";
import type {
  CustomerConversation,
  CustomerConversationThread,
  CustomerMessage,
} from "../types/customerMessages";

interface Envelope<T> {
  status: string;
  data: T;
}

export const customerMessagesApi = {
  list: (signal?: AbortSignal) =>
    request<Envelope<{ unread: number; conversations: CustomerConversation[] }>>(
      "/bookings/conversations",
      { signal },
    ),

  thread: (conversationId: string, signal?: AbortSignal) =>
    request<Envelope<CustomerConversationThread>>(
      `/bookings/conversations/${conversationId}`,
      { signal },
    ),

  send: (conversationId: string, body: string) =>
    request<Envelope<{ message: CustomerMessage }>>(
      `/bookings/conversations/${conversationId}/messages`,
      { method: "POST", body: { body } },
    ),
};

