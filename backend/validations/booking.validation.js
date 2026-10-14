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
      startDate: z.iso.datetime({ offset: true }),
      endDate: z.iso.datetime({ offset: true }),
      primaryDriver: z.object({
        firstName: z.string().trim().min(1).max(100),
        lastName: z.string().trim().min(1).max(100),
        email: z.email().max(254),
        phone: z.string().regex(/^\+2189[1245]\d{7}$/, "Enter a valid Libyan mobile number"),
        eligibilityConfirmed: z.literal(true),
      }),
      pickupLocation: z.string().trim().min(1).max(300).optional(),
      pickupMethod: ciEnum(["BRANCH_PICKUP", "DELIVERY"]).optional(),
      discountAmount: z.coerce.number().min(0).optional(),
      paymentMethod: z.enum(["CASH_ON_DELIVERY"]).optional(),
      addonIds: z
        .array(z.enum(["insurance", "driver", "childseat", "delivery"]))
        .max(4)
        .default([]),
    })
    .refine(dateRangeIsValid, dateRangeError)
    .refine((data) => Date.parse(data.startDate) > Date.now(), { message: "Pickup must be in the future", path: ["startDate"] }),
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
