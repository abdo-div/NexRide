import { z } from "zod";
import { ciEnum } from "./common.validation.js";

export const updateMeSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(100).optional(),
    email: z.string().email("Please provide a valid email address").optional(),
    phoneNumber: z.string().trim().min(1).optional(),
  }),
});

export const adminUpdateUserSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(100).optional(),
    email: z.string().email("Please provide a valid email address").optional(),
    phoneNumber: z.string().trim().min(1).optional(),
    role: z.enum(["customer", "company", "admin"]).optional(),
  }),
});

export const updateUserStatusSchema = z.object({
  body: z.object({
    status: ciEnum(
      ["ACTIVE", "SUSPENDED", "BANNED"],
      "Invalid status value provided",
    ),
  }),
});
