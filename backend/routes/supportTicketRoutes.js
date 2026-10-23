import express from "express";
import { protect, restrictTo } from "../middlewares/authMiddleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  addMessage,
  bookingTickets,
  createTicket,
  staffTickets,
  updateStatus,
} from "../controllers/supportTicketController.js";
import {
  bookingSupportParamSchema,
  createSupportTicketSchema,
  supportMessageSchema,
  supportStatusSchema,
} from "../validations/supportTicket.validation.js";

const router = express.Router();
router.use(protect);

router.post("/", restrictTo("customer"), validate(createSupportTicketSchema), createTicket);
router.get(
  "/booking/:bookingId",
  restrictTo("customer"),
  validate(bookingSupportParamSchema),
  bookingTickets,
);
router.get("/staff", restrictTo("company", "admin"), staffTickets);
router.post(
  "/:id/messages",
  restrictTo("customer", "company", "admin"),
  validate(supportMessageSchema),
  addMessage,
);
router.patch(
  "/:id/status",
  restrictTo("customer", "company", "admin"),
  validate(supportStatusSchema),
  updateStatus,
);

export default router;
