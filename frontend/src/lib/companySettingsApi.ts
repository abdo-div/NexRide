import { request } from "./apiClient";
import type {
  CompanySettingsData,
  CompanySettingsPatch,
  CompanySettingsPasswordInput,
} from "../types/companySettings";

interface CompanySettingsResponse {
  status: string;
  data: { settings: CompanySettingsData };
}

interface CompanyUpdateResponse {
  status: string;
  data: { company: Record<string, unknown> };
}

/**
 * Tenant-scoped settings surface (GET/PATCH /companies/settings). For a company
 * session the tenant always comes from the JWT, so any forged `companyId` query
 * key can never read or rewrite another operator's profile.
 */
export const companySettingsApi = {
  get: (signal?: AbortSignal) =>
    request<CompanySettingsResponse>("/companies/settings", { signal }),

  updateProfile: (patch: CompanySettingsPatch, signal?: AbortSignal) =>
    request<CompanyUpdateResponse>("/companies/settings", {
      method: "PATCH",
      body: patch,
      signal,
    }),

  updatePassword: (input: CompanySettingsPasswordInput, signal?: AbortSignal) =>
    request<{ status: string }>("/users/update-my-password", {
      method: "PATCH",
      body: input,
      signal,
    }),
};