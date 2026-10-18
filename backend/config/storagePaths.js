import path from "node:path";
import { fileURLToPath } from "node:url";

export const backendRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
export const bundledPublicRoot = path.join(backendRoot, "public");

export const isPathInside = (parent, candidate) => {
  const relative = path.relative(parent, candidate);
  return (
    relative === "" ||
    (!relative.startsWith("..") && !path.isAbsolute(relative))
  );
};

export const publicStorageRoot = process.env.PUBLIC_STORAGE_DIR
  ? path.resolve(process.env.PUBLIC_STORAGE_DIR)
  : bundledPublicRoot;

export const privateStorageRoot = process.env.PRIVATE_STORAGE_DIR
  ? path.resolve(process.env.PRIVATE_STORAGE_DIR)
  : path.join(backendRoot, "private");

// Preserve the explicit error used by the protected-document regression test.
if (isPathInside(bundledPublicRoot, privateStorageRoot)) {
  throw new Error(
    "PRIVATE_STORAGE_DIR must not be inside backend/public; partner verification documents are private.",
  );
}

if (
  isPathInside(publicStorageRoot, privateStorageRoot) ||
  isPathInside(privateStorageRoot, publicStorageRoot)
) {
  throw new Error(
    "PUBLIC_STORAGE_DIR and PRIVATE_STORAGE_DIR must be separate, non-overlapping directories.",
  );
}
