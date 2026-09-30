import { z } from "zod";
import { objectId } from "./common.validation.js";

export const initiatePaymentSchema = z.object({
  body: z.object({
    bookingId: objectId,
  }),
});

export const verifyPaymentSchema = z.object({
  body: z.object({
    merchantReference: z
      .string()
      .trim()
      .min(3, "Merchant reference is too short")
      .max(40, "Merchant reference is too long"),
    /** Optional reference surfaced by the LightBox complete callback. */
    systemReference: z.string().trim().optional(),
  }),
});