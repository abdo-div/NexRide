import { vehicleImagesDirectory } from "../config/publicStorage.js";
import { saveProcessedImage } from "./imageStorage.js";

export const saveVehicleImage = (buffer, filename, quality = 85) =>
  saveProcessedImage({
    buffer,
    directory: vehicleImagesDirectory,
    filename,
    process: (image) =>
      image.resize(2000, 1333).toFormat("jpeg").jpeg({ quality }),
  });
