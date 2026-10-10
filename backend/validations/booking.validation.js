import { z } from "zod";
import { objectId, isoDate, ciEnum } from "./common.validation.js";

const dateRangeIsValid = (data) =>
  new Date(data.endDate) > new Date(data.startDate);

const dateRangeError = {
  message: "End date must be strictly after start date",
  path: ["endDate"],
};

export const createBookingSchema = z.object({
  body: z
    .object({
      vehicleId: objectId,
      startDate: isoDate,
      endDate: isoDate,
      pickupLocation: z.string().trim().min(1).max(300).optional(),
      pickupMethod: ciEnum(["BRANCH_PICKUP", "DELIVERY"]).optional(),
      discountAmount: z.coerce.number().min(0).optional(),
      paymentMethod: z.enum(["CASH_ON_DELIVERY"]).optional(),
      addonIds: z
        .array(z.enum(["insurance", "driver", "childseat", "delivery"]))
        .max(4)
        .default([]),
    })
    .refine(dateRangeIsValid, dateRangeError),
});
export const checkAvailabilitySchema = z.object({
  query: z
    .object({
      vehicleId: objectId,
      startDate: isoDate,
      endDate: isoDate,
    })
    .refine(dateRangeIsValid, dateRangeError),
  });
