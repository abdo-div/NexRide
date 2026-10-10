import { request } from "./apiClient";
import type {
  CompanyChatMessage,
  CompanyConversationThread,
  CompanyMessagesData,
  CompanyMessagesQuery,
} from "../types/companyMessages";

interface Envelope<T> {
  status: string;
  data: T;
}

const buildQuery = (query: CompanyMessagesQuery): string => {
  const params = new URLSearchParams();
  params.set("page", String(query.page));
  params.set("limit", String(query.limit));
  if (query.view !== "all") params.set("view", query.view);
  if (query.channel !== "all") params.set("channel", query.channel);
  const term = query.q.trim();
  if (term) params.set("q", term);
  return params.toString();
};

/**
 * Tenant-scoped Messages inbox (GET /companies/conversations and friends). For
 * a company session the tenant comes from the JWT — any forged `companyId`
 * query key is ignored server-side, so no cross-tenant thread leaks. Every
 * mutation returns the real persisted row, never an optimistic echo.
 */
export const companyMessagesApi = {
  list: (query: CompanyMessagesQuery, signal?: AbortSignal) =>
    request<Envelope<CompanyMessagesData>>(
      `/companies/conversations?${buildQuery(query)}`,
      { signal },
    ),

  thread: (conversationId: string, signal?: AbortSignal) =>
    request<Envelope<CompanyConversationThread>>(
      `/companies/conversations/${conversationId}`,
      { signal },
    ),

  send: (conversationId: string, body: string) =>
    request<Envelope<{ message: CompanyChatMessage }>>(
      `/companies/conversations/${conversationId}/messages`,
      { method: "POST", body: { body } },
    ),

  markRead: (conversationId: string) =>
    request<Envelope<{ id: string; unreadForCompany: number }>>(
      `/companies/conversations/${conversationId}/read`,
      { method: "PATCH" },
    ),

  markAllRead: () =>
    request<Envelope<{ updated: number }>>(
      `/companies/conversations/read-all`,
      { method: "PATCH" },
    ),

  broadcast: (body: string) =>
    request<Envelope<{ sent: number; conversations: number }>>(
      `/companies/conversations/broadcast`,
      { method: "POST", body: { body } },
    ),
};
