import { request } from "./apiClient";
import type { SavedSearch, SavedSearchCriteria } from "../types/savedSearch";

export const savedSearchApi = {
  list: (signal?: AbortSignal) => request<{ status: string; data: { searches: SavedSearch[] } }>("/saved-searches", { signal }),
  create: (input: { name: string; criteria: SavedSearchCriteria; alertsEnabled: boolean }) => request<{ status: string; data: { search: SavedSearch } }>("/saved-searches", { method: "POST", body: input }),
  update: (id: string, patch: { name?: string; alertsEnabled?: boolean }) => request<{ status: string; data: { search: SavedSearch } }>(`/saved-searches/${encodeURIComponent(id)}`, { method: "PATCH", body: patch }),
  remove: (id: string) => request<void>(`/saved-searches/${encodeURIComponent(id)}`, { method: "DELETE" }),
};
