import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const vehicleImagesDirectory = path.join(__dirname, "..", "public", "vehicles");

export const saveVehicleImage = async (buffer, filename, quality = 85) => {
  await mkdir(vehicleImagesDirectory, { recursive: true });
  await sharp(buffer)
    .resize(2000, 1333)
    .toFormat("jpeg")
    .jpeg({ quality })
    .toFile(path.join(vehicleImagesDirectory, filename));

  return filename;
};
