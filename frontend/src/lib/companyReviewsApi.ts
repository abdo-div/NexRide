import { request } from "./apiClient";
import type {
  CompanyReviewsData,
  CompanyReviewsQuery,
} from "../types/companyReviews";

interface CompanyReviewsResponse {
  status: string;
  data: CompanyReviewsData;
}

interface CompanyReviewReplyResponse {
  status: string;
  data: { review: { id?: string } };
}

const buildQuery = (query: CompanyReviewsQuery): string => {
  const params = new URLSearchParams();
  params.set("page", String(query.page));
  params.set("limit", String(query.limit));
  if (query.star !== "all") params.set("star", String(query.star));
  if (query.vehicleId) params.set("vehicleId", query.vehicleId);
  if (query.status !== "all") params.set("status", query.status);
  if (query.period !== "all") params.set("period", query.period);
  return params.toString();
};

/**
 * Tenant-scoped reviews & ratings workspace (GET /companies/reviews). The deck
 * is always the company's full review set; only the register page honors the
 * filter query. For a company session the tenant comes from the JWT — any
 * forged `companyId` query key is ignored, so no cross-tenant reviews leak.
 */
export const companyReviewsApi = {
  get: (query: CompanyReviewsQuery, signal?: AbortSignal) =>
    request<CompanyReviewsResponse>(
      `/companies/reviews?${buildQuery(query)}`,
      { signal },
    ),

  reply: (reviewId: string, response: string) =>
    request<CompanyReviewReplyResponse>(`/companies/reviews/${reviewId}/reply`, {
      method: "POST",
      body: JSON.stringify({ response }),
    }),
};