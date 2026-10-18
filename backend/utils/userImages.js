import { userImagesDirectory } from "../config/publicStorage.js";
import { saveProcessedImage } from "./imageStorage.js";

export const saveUserPhoto = (buffer, filename) =>
  saveProcessedImage({
    buffer,
    directory: userImagesDirectory,
    filename,
    process: (image) =>
      image.resize(500, 500).toFormat("jpeg").jpeg({ quality: 90 }),
  });
