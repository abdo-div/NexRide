import express from "express";
import { protect, restrictTo } from "../middlewares/authMiddleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { idParamSchema } from "../validations/common.validation.js";
import {
  listNotifications,
  readAllNotifications,
  readNotification,
} from "../controllers/notificationController.js";

const router = express.Router();
router.use(protect, restrictTo("customer"));
router.get("/", listNotifications);
router.patch("/read-all", readAllNotifications);
router.patch("/:id/read", validate(idParamSchema()), readNotification);
export default router;
