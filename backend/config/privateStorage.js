import path from "node:path";
import { privateStorageRoot } from "./storagePaths.js";

export { privateStorageRoot };
export const companyDocumentsDirectory = path.join(
  privateStorageRoot,
  "company-documents",
);

export const companyDocumentApiPath = (companyId, storedName) =>
  `/api/v1/companies/application-documents/${encodeURIComponent(String(companyId))}/${encodeURIComponent(storedName)}`;

