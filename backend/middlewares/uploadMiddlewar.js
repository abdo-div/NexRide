import multer from "multer";
import AppError from "../utils/appError.js";

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startswith("image")) {
    cb(null, true);
  } else {
    cb(new AppError("not an image! please upload only images", 400), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

export const uploadSingleImage = (fieldName) => upload.single(fieldName);
export const uploadMultipleImages = (fieldName, maxCount = 5) =>
  upload.array(fieldName, maxCount);
export const uploadMixedfields = (fieldsArray) => upload.fields(fieldsArray);
