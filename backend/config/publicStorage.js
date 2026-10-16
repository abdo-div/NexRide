import path from "node:path";
import { publicStorageRoot } from "./storagePaths.js";

export { publicStorageRoot };
export const vehicleImagesDirectory = path.join(publicStorageRoot, "vehicles");
export const userImagesDirectory = path.join(publicStorageRoot, "users");
export const companyImagesDirectory = path.join(publicStorageRoot, "companies");

