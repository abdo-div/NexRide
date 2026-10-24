import { z } from "zod";
import { objectId } from "./common.validation.js";

export const createReviewSchema = z.object({
  params: z.object({ vehicleId: objectId }),
  body: z.object({
    bookingId: objectId,
    rating: z.coerce
      .number()
      .int()
      .min(1, "Rating must be at least 1")
      .max(5, "Rating cannot exceed 5"),
    review: z
      .string()
      .trim()
      .min(1, "Review text cannot be empty")
      .max(1000, "Review text cannot exceed 1000 characters"),
  }).strict(),
});

export const updateReviewSchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object({
    rating: z.coerce.number().int().min(1).max(5).optional(),
    review: z.string().trim().min(1).max(1000).optional(),
  }).strict().refine((value) => Object.keys(value).length > 0, "At least one review field is required"),
});

export const companyResponseSchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object({
    response: z
      .string()
      .trim()
      .min(1, "Please provide a response text")
      .max(1000, "Response cannot exceed 1000 characters"),
  }),
});

export const reviewIdSchema = z.object({
  params: z.object({ vehicleId: objectId, id: objectId }),
});

export const reviewVehicleSchema = z.object({
  params: z.object({ vehicleId: objectId }),
});
