import { request, ApiError, API_BASE_URL } from "./apiClient";
import { getToken } from "./tokenStorage";
import type {
  CompanyEarningsData,
  CompanyEarningsQuery,
} from "../types/companyEarnings";

interface CompanyEarningsResponse {
  status: string;
  data: CompanyEarningsData;
}

interface CompanyPayoutRequestData {
  requestedAt: string;
  pendingPayouts: number;
  payout: { bankName: string; iban: string; accountName: string } | null;
}

interface CompanyPayoutRequestResponse {
  status: string;
  data: { payout: CompanyPayoutRequestData };
}

const buildQuery = (query: CompanyEarningsQuery): string => {
  const params = new URLSearchParams();
  params.set("page", String(query.page));
  params.set("limit", String(query.limit));
  if (query.range !== "all") params.set("range", query.range);
  if (query.chartRange !== "30d") params.set("chartRange", query.chartRange);
  if (query.search.trim().length > 0) params.set("search", query.search.trim());
  if (query.status !== "all") params.set("status", query.status);
  if (query.vehicleId) params.set("vehicleId", query.vehicleId);
  if (query.method !== "all") params.set("method", query.method);
  return params.toString();
};

/**
 * Tenant-scoped earnings & transactions workspace (GET
 * /payments/tenant/earnings). The deck always reflects the tenant's whole
 * ledger inside the selected range; only the register page honors the search /
 * status / vehicle / method filters. For a company session the tenant comes
 * from the JWT, so a forged `companyId` query key can never leak another
 * operator's ledger.
 */
export const companyEarningsApi = {
  get: (query: CompanyEarningsQuery, signal?: AbortSignal) =>
    request<CompanyEarningsResponse>(
      `/payments/tenant/earnings?${buildQuery(query)}`,
      { signal },
    ),

  /**
   * Streams the official PDF audit dossier for a single payment. The backend
   * route (GET /payments/:id/invoice) runs its own ownership / tenant guard
   * before releasing any PII, so a partner can only ever pull invoices for
   * payments that belong to its own ledger. Returns a Blob because the
   * endpoint streams binary application/pdf, not JSON.
   */
  downloadInvoice: async (paymentId: string): Promise<Blob> => {
    const token = getToken();
    const response = await fetch(
      `${API_BASE_URL}/payments/${encodeURIComponent(paymentId)}/invoice`,
      {
        headers: {
          Accept: "application/pdf",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
      },
    );

    if (!response.ok) {
      let message = `Request failed with status ${response.status}`;
      try {
        const payload = (await response.json()) as { message?: unknown };
        if (typeof payload.message === "string" && payload.message) {
          message = payload.message;
        }
      } catch {
        /* non-JSON error body */
      }
      throw new ApiError(message, response.status);
    }

    return response.blob();
  },

  /**
   * Ask the platform to run the tenant's next payout cycle into its recorded
   * bank rail (POST /companies/payouts/request). Company sessions only; the
   * tenant is resolved from the session. Disbursement stays admin-approved, so
   * this only records the operator's request.
   */
  requestPayout: (signal?: AbortSignal) =>
    request<CompanyPayoutRequestResponse>("/companies/payouts/request", {
      method: "POST",
      signal,
    }),
};