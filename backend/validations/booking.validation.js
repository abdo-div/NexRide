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
      promotionCode: z.string().trim().min(1).max(32).optional(),
      paymentMethod: z.enum(["CASH_ON_DELIVERY"]).optional(),
      addonIds: z
        .array(z.enum(["insurance", "driver", "childseat", "delivery"]))
        .max(4)
        .default([]),
    }).strict()
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

export const customerHandoverSchema = z.object({
  params: z.object({
    id: objectId,
    stage: ciEnum(["PICKUP", "RETURN"]),
  }),
  body: z.discriminatedUnion("stage", [
    z.object({
      stage: z.literal("PICKUP"),
      licenceReady: z.literal(true),
      identityReady: z.literal(true),
      vehicleInspected: z.literal(true),
      fuelRecorded: z.literal(true),
      notes: z.string().trim().max(1000).optional().default(""),
    }).strict(),
    z.object({
      stage: z.literal("RETURN"),
      personalItemsRemoved: z.literal(true),
      fuelRestored: z.boolean(),
      damageReported: z.boolean(),
      fuelLevel: ciEnum(["EMPTY", "QUARTER", "HALF", "THREE_QUARTERS", "FULL"]),
      odometer: z.coerce.number().min(0).max(9999999).nullable().optional(),
      notes: z.string().trim().max(1000).optional().default(""),
    }).strict(),
  ]),
}).superRefine((value, context) => {
  if (value.params.stage !== value.body.stage) {
    context.addIssue({ code: "custom", path: ["body", "stage"], message: "Handover stage does not match URL" });
  }
});
