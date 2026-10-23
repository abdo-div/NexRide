import { z } from "zod";
import { ciEnum, objectId } from "./common.validation.js";

const categories = ["BOOKING_CHANGE", "PAYMENT", "PICKUP_RETURN", "VEHICLE", "REFUND", "OTHER"];

export const createSupportTicketSchema = z.object({
  body: z.object({
    bookingId: objectId,
    category: ciEnum(categories),
    subject: z.string().trim().min(3).max(120),
    message: z.string().trim().min(2).max(2000),
    priority: ciEnum(["NORMAL", "URGENT"]).optional(),
  }).strict(),
});

export const bookingSupportParamSchema = z.object({
  params: z.object({ bookingId: objectId }),
});

export const supportMessageSchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object({ message: z.string().trim().min(1).max(2000) }).strict(),
});

export const supportStatusSchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object({
    status: ciEnum(["OPEN", "WAITING_FOR_CUSTOMER", "IN_PROGRESS", "RESOLVED", "CLOSED"]),
  }).strict(),
});
