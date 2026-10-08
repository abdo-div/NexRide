import { z } from "zod";
import { objectId } from "./common.validation.js";

const companyBody = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Please provide the official company name")
    .max(120, "Company name cannot exceed 120 characters"),
  subdomain: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "Subdomain must be between 3 and 30 characters")
    .max(30, "Subdomain must be between 3 and 30 characters")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Invalid subdomain format. Use lowercase letters, numbers, and single hyphens only",
    ),
  email: z.string().email("Please provide a valid company email"),
  phone: z.string().trim().min(1, "Company contact phone number is required"),
  city: z.string().trim().min(1, "Main company city is required"),
  address: z.string().trim().min(1, "Physical business address is required"),
  description: z
    .string()
    .trim()
    .max(2000, "Company description cannot exceed 2000 characters")
    .optional(),
});

export const createCompanySchema = z.object({ body: companyBody });

// Direct RTGS settlement rail chosen by the operator. Leaving a field empty is
// allowed (each entry is optional); the model uppercases the IBAN on save.
const companyPayoutBody = z.object({
  accountName: z.string().trim().max(120, "Account name cannot exceed 120 characters").optional(),
  bankName: z.string().trim().max(80, "Bank name cannot exceed 80 characters").optional(),
  iban: z.string().trim().max(40, "IBAN cannot exceed 40 characters").optional(),
});

export const updateCompanySchema = z.object({
  body: companyBody.partial().extend({
    payout: companyPayoutBody.partial().optional(),
  }),
});

export const updateCommissionSchema = z.object({
  body: z.object({
    commissionRate: z.coerce
      .number()
      .min(0, "Commission cannot be negative")
      .max(100, "Commission cannot exceed 100%"),
  }),
});

export const toggleVerificationSchema = z.object({
  body: z.object({
    isVerified: z
      .union([
        z.boolean(),
        z.enum(["true", "false"]).transform((value) => value === "true"),
      ])
      .optional(),
  }),
});

export const updateCompanyStatusSchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object({
    status: z.enum(["PENDING", "APPROVED", "SUSPENDED", "REJECTED"]),
  }),
});
