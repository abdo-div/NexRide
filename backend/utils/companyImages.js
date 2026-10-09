import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const companyLogosDirectory = path.join(__dirname, "..", "public", "companies");

export const saveCompanyLogo = async (buffer, filename) => {
  await mkdir(companyLogosDirectory, { recursive: true });
  await sharp(buffer)
    .resize(512, 512, { fit: "cover", position: "centre" })
    .toFormat("webp")
    .webp({ quality: 88 })
    .toFile(path.join(companyLogosDirectory, filename));
  return filename;
};
