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

export const cancelBookingSchema = z.object({
  params: z.object({ id: objectId }),
  body: z
    .object({
      reason: z.string().trim().min(1).max(500).nullable().optional(),
    })
    .strict()
    .default({}),
});

export const modifyBookingSchema = z.object({
  params: z.object({ id: objectId }),
  body: z
    .object({
      startDate: isoDate,
      endDate: isoDate,
      pickupLocation: z.string().trim().min(1).max(300),
      pickupMethod: ciEnum(["BRANCH_PICKUP", "DELIVERY"]),
      addonIds: z
        .array(z.enum(["insurance", "driver", "childseat", "delivery"]))
        .max(4)
        .default([]),
    })
    .strict()
    .refine(dateRangeIsValid, dateRangeError)
    .refine((data) => new Date(data.startDate) > new Date(), {
      message: "Pickup date must be in the future",
      path: ["startDate"],
    }),
});

export const updateBookingStatusSchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object({
    status: ciEnum(["PAID", "CONFIRMED", "ACTIVE", "COMPLETED", "CANCELLED"]),
  }).strict(),
});
