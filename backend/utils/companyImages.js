import { companyImagesDirectory } from "../config/publicStorage.js";
import { saveProcessedImage } from "./imageStorage.js";

export const saveCompanyLogo = (buffer, filename) =>
  saveProcessedImage({
    buffer,
    directory: companyImagesDirectory,
    filename,
    process: (image) =>
      image
        .resize(512, 512, { fit: "cover", position: "centre" })
        .toFormat("webp")
        .webp({ quality: 88 }),
  });

export const saveCompanyCover = (buffer, filename) =>
  saveProcessedImage({
    buffer,
    directory: companyImagesDirectory,
    filename,
    process: (image) =>
      image
        .resize(1800, 600, { fit: "cover", position: "centre" })
        .toFormat("webp")
        .webp({ quality: 86 }),
  });
