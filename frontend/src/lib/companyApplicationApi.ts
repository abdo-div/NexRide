import { request } from "./apiClient";
import type {
  ApplicationStatusResponse,
  CompanyApplicationPayload,
  CompanyApplicationResult,
} from "../types/companyApplication";

interface ApplicationResponse {
  status: string;
  token: string;
  data: { user: CompanyApplicationResult["user"]; company: CompanyApplicationResult["company"] };
}

/**
 * Submits the full partner-application wizard as `multipart/form-data`: the
 * structured fields ride in a JSON `data` part and the verification documents
 * are attached as `documents` file parts. The endpoint signs the applicant in,
 * so the caller adopts the returned session token.
 */
export const companyApplicationApi = {
  apply: (payload: CompanyApplicationPayload, documents: File[]): Promise<ApplicationResponse> => {
    const formData = new FormData();
    formData.append("data", JSON.stringify(payload));
    documents.forEach((file) => formData.append("documents", file, file.name));

    return request<ApplicationResponse>("/companies/apply", {
      method: "POST",
      auth: false,
      body: formData,
    });
  },

  /**
   * Returns the signed-in operator's own application record, including while
   * the company is PENDING or REJECTED, so the status page can render the
   * compliance progress and any rejection notes.
   */
  myApplication: (): Promise<ApplicationStatusResponse> =>
    request<ApplicationStatusResponse>("/companies/me/application", {
      method: "GET",
    }),
};