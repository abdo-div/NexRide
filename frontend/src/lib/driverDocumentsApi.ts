import { API_BASE_URL, request } from "./apiClient";
import { trackedFetch } from "./apiAvailability";

export type DriverVerificationStatus = "NOT_UPLOADED" | "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED";
export interface DriverDocumentInfo { uploaded:boolean; originalName:string|null; mimeType:string|null; uploadedAt:string|null; expiresAt:string|null; }
export interface DriverVerification { status:DriverVerificationStatus; licence:DriverDocumentInfo; identity:DriverDocumentInfo; reviewedAt:string|null; rejectionReason:string|null; }
interface Response { status:string; data:{ verification:DriverVerification } }

export const driverDocumentsApi = {
  mine: () => request<Response>("/users/me/driver-documents"),
  upload: (form:FormData) => request<Response>("/users/me/driver-documents", { method:"PATCH", body:form }),
  getCustomer: (customerId:string) => request<Response>(`/users/${encodeURIComponent(customerId)}/driver-documents`),
  review: (customerId:string, status:"APPROVED"|"REJECTED", rejectionReason?:string) => request<Response>(`/users/${encodeURIComponent(customerId)}/driver-documents/review`, { method:"PATCH", body:{status,rejectionReason} }),
  openFile: async (customerId:string, kind:"licence"|"identity") => {
    const response=await trackedFetch(`${API_BASE_URL}/users/${encodeURIComponent(customerId)}/driver-documents/${kind}/file`,{credentials:"include"});
    if(!response.ok) throw new Error("Unable to open document");
    const url=URL.createObjectURL(await response.blob());
    window.open(url,"_blank","noopener,noreferrer");
    window.setTimeout(()=>URL.revokeObjectURL(url),60_000);
  },
};
