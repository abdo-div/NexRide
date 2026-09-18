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

export const checkoutSessionSchema = z.object({
  params: z.object({ vehicleId: objectId }),
  query: z
    .object({
      startDate: isoDate.optional(),
      endDate: isoDate.optional(),
    })
    .optional(),
});
