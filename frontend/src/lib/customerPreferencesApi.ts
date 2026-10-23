import { request } from "./apiClient";
import type { CustomerPreferences } from "../types/customerPreferences";

interface PreferencesResponse {
  status: string;
  data: { preferences: CustomerPreferences };
}

export const customerPreferencesApi = {
  get: (signal?: AbortSignal) => request<PreferencesResponse>("/users/me/preferences", { signal }),
  update: (preferences: CustomerPreferences) =>
    request<PreferencesResponse>("/users/me/preferences", { method: "PATCH", body: preferences }),
};
