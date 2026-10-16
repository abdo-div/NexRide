import path from "node:path";
import { fileURLToPath } from "node:url";

const backendRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const publicRoot = path.join(backendRoot, "public");

const isInside = (parent, candidate) => {
  const relative = path.relative(parent, candidate);
  return (
    relative === "" ||
    (!relative.startsWith("..") && !path.isAbsolute(relative))
  );
};

const configuredRoot = process.env.PRIVATE_STORAGE_DIR
  ? path.resolve(process.env.PRIVATE_STORAGE_DIR)
  : path.join(backendRoot, "private");

// Verification documents include identity and company-registration material.
// Fail at startup instead of ever allowing an operator to configure their
// storage beneath the anonymously served public directory.
if (isInside(publicRoot, configuredRoot)) {
  throw new Error(
    "PRIVATE_STORAGE_DIR must not be inside backend/public; partner verification documents are private.",
  );
}

export const privateStorageRoot = configuredRoot;
export const companyDocumentsDirectory = path.join(
  privateStorageRoot,
  "company-documents",
);

export const companyDocumentApiPath = (companyId, storedName) =>
  `/api/v1/companies/application-documents/${encodeURIComponent(String(companyId))}/${encodeURIComponent(storedName)}`;

