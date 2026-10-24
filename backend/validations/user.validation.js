import { z } from "zod";
import { ciEnum, objectId } from "./common.validation.js";

export const updateMeSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(100).optional(),
    email: z.string().email("Please provide a valid email address").optional(),
    phoneNumber: z.string().trim().min(1).optional(),
  }),
});

export const adminUpdateUserSchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object({
    name: z.string().trim().min(1).max(100).optional(),
    email: z.string().email("Please provide a valid email address").optional(),
    phoneNumber: z.string().trim().min(1).optional(),
    role: z.enum(["customer", "company", "admin"]).optional(),
  }),
});

export const updateUserStatusSchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object({
    status: ciEnum(
      ["ACTIVE", "SUSPENDED", "BANNED"],
      "Invalid status value provided",
    ),
  }),
});

const timeValue = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Time must use HH:mm format");

export const updateCustomerPreferencesSchema = z.object({
  body: z.object({
    preferredCity: z.string().trim().max(100),
    vehicleTypes: z.array(z.enum(["SEDAN", "SUV", "HATCHBACK", "LUXURY", "VAN", "PICKUP"])).max(6),
    transmission: z.enum(["ANY", "MANUAL", "AUTOMATIC"]),
    fuelType: z.enum(["ANY", "GASOLINE", "DIESEL", "ELECTRIC", "HYBRID"]),
    defaultRentalDays: z.number().int().min(1).max(30),
    pickupTime: timeValue,
    returnTime: timeValue,
    paymentMethod: z.enum(["CARD", "CASH_ON_DELIVERY"]),
  }).strict(),
});
