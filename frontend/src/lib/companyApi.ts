import { request } from "./apiClient";

/** Public subset of the Company document returned by GET /api/v1/companies. */
export interface CompanyDto {
  _id?: string;
  id?: string;
  name: string;
  city?: string;
  address?: string;
  description?: string;
  logo?: string;
  status?: string;
}

interface CompaniesResponse {
  status: string;
  results: number;
  data: { companies: CompanyDto[] };
}

/**
 * Public-safe company profile returned by GET /companies/:id. The backend
 * deliberately exposes only these fields — contact records and internal flags
 * are never projected.
 */
export interface CompanyPublicDto {
  _id?: string;
  name: string;
  slug?: string;
  logo?: string;
  description?: string;
  city?: string;
}

interface CompanyResponse {
  status: string;
  data: { company: CompanyPublicDto };
}

/** Safe public projection; the collection also stores contact records. */
const DEFAULT_FIELDS = "_id,name,city,address,description,logo,status";

/**
 * Public operator directory; only approved, non-deleted companies are returned.
 * A whitelist projection is sent so the client never receives contact details
 * that exist on the Company collection (email, phone, owner…).
 */
export const companyApi = {
  listActive: (options: { fields?: string; signal?: AbortSignal } = {}) =>
    request<CompaniesResponse>(
      `/companies?fields=${encodeURIComponent(
        options.fields ?? DEFAULT_FIELDS,
      )}`,
      { auth: false, signal: options.signal },
    ),

  /** Single approved company for the public profile page. 404 when unknown. */
  getById: (id: string, signal?: AbortSignal) =>
    request<CompanyResponse>(`/companies/${encodeURIComponent(id)}`, {
      auth: false,
      signal,
    }),
};