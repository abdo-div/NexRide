import { request } from "./apiClient";

/** Public subset of the Company document returned by GET /api/v1/companies. */
export interface CompanyDto {
  _id?: string;
  id?: string;
  name: string;
  city?: string;
  status?: string;
}

interface CompaniesResponse {
  status: string;
  results: number;
  data: { companies: CompanyDto[] };
}

/** Public operator directory; every non-deleted company is returned. */
export const companyApi = {
  listActive: (signal?: AbortSignal) =>
    request<CompaniesResponse>("/companies", { auth: false, signal }),
};