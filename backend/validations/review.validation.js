import { z } from "zod";
import { objectId } from "./common.validation.js";

export const createReviewSchema = z.object({
  body: z.object({
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
    // Optional: injected server-side from nested params when omitted
    vehicleId: objectId.optional(),
  }),
});

export const updateReviewSchema = z.object({
  body: z.object({
    rating: z.coerce.number().int().min(1).max(5).optional(),
    review: z.string().trim().min(1).max(1000).optional(),
  }),
});

export const companyResponseSchema = z.object({
  body: z.object({
    response: z
      .string()
      .trim()
      .min(1, "Please provide a response text")
      .max(1000, "Response cannot exceed 1000 characters"),
  }),
});
