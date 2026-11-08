import { z } from "zod";
import { objectId } from "./common.validation.js";

export const initiateMpgsPaymentSchema = z.object({
  body: z.object({ bookingId: objectId }).strict(),
});

export const verifyMpgsPaymentSchema = z.object({
  body: z
    .object({
      orderId: z
        .string()
        .trim()
        .min(1)
        .max(40)
        .regex(/^[A-Za-z0-9_-]+$/, "Invalid MPGS order ID"),
      resultIndicator: z.string().trim().max(256).optional(),
    })
    .strict(),
});

export const processMpgsRefundSchema = z.object({
  body: z.object({ bookingId: objectId }).strict(),
});

export const completeMpgsSimulationSchema = z.object({
  body: z.object({
    orderId: z.string().trim().min(1).max(40).regex(/^[A-Za-z0-9_-]+$/),
  }).strict(),
});
