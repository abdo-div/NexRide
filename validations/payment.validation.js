import { z } from "zod";
import { objectId, ciEnum } from "./common.validation.js";

export const processPaymentSchema = z.object({
  body: z.object({
    bookingId: objectId,
    paymentMethod: ciEnum(
      ["CASH_ON_DELIVERY", "LOCAL_CARD", "STRIPE", "WALLET"],
      "Invalid payment method",
    ).optional(),
  }),
});
