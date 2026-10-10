import { z } from "zod";

/**
 * Schema for the public partner-application wizard (`POST /companies/apply`).
 *
 * The wizard's structured fields arrive as a single JSON string inside
 * `multipart/form-data` (`data` field) while the verification documents are
 * uploaded as separate file parts. The controller JSON.parses `data` before
 * running it through this schema.
 */
export const companyApplicationSchema = z.object({
  applicant: z
    .object({
      name: z
        .string()
        .trim()
        .min(1, "Please tell us your name")
        .max(100, "Name cannot exceed 100 characters"),
      email: z.string().email("Please provide a valid email address"),
      phoneNumber: z
        .string()
        .trim()
        .min(1, "Please provide your phone number"),
      password: z
        .string()
        .min(8, "Password must be at least 8 characters long"),
      passwordConfirm: z.string().min(1, "Please confirm your password"),
    })
    .refine((data) => data.password === data.passwordConfirm, {
      message: "Passwords do not match",
      path: ["passwordConfirm"],
    }),
  company: z.object({
    name: z
      .string()
      .trim()
      .min(1, "Please provide the official company name")
      .max(120, "Company name cannot exceed 120 characters"),
    commercialRegisterNumber: z
      .string()
      .trim()
      .min(1, "Please provide the commercial registry number"),
    city: z.string().trim().min(1, "Main company city is required"),
    address: z.string().trim().min(1, "Physical business address is required"),
  }),
  fleet: z.object({
    tier: z.enum(["BOUTIQUE", "MIDTIER", "SELECTED", "MAJOR", "ENTERPRISE"]),
    categories: z
      .array(
        z.enum([
          "ECONOMY",
          "COMPACT",
          "SEDAN",
          "SUV",
          "LUXURY_EXECUTIVE",
          "PASSENGER_VAN",
          "PICKUP_UTILITY",
          "CHAFFEURED_ARMORED",
        ]),
      )
      .min(1, "Select at least one vehicle category"),
  }),
  hubs: z.object({
    active: z
      .array(z.string().trim().min(1))
      .min(1, "Select at least one operating hub"),
    depots: z
      .array(
        z.object({
          name: z.string().trim().min(1, "Depot name is required"),
          address: z.string().trim().min(1, "Depot address is required"),
          hubType: z.enum(["PRIMARY", "AIRPORT_TERMINAL", "BRANCH"]),
          phone: z.string().trim().default(""),
          hours: z.string().trim().default(""),
        }),
      )
      .min(1, "Add at least one depot or handover location"),
  }),
  policy: z.object({
    minDurationDays: z.coerce.number().int().min(1),
    maxDurationDays: z.coerce.number().int().min(1),
    minDriverAge: z.coerce.number().int().min(18).max(99),
    cancellationPolicy: z.enum(["FLEXIBLE", "MODERATE", "STRICT"]),
    depositAmountLYD: z.coerce.number().min(0).max(100000),
    additionalDriverAllowed: z.boolean().default(true),
    inVehicleSmokingAllowed: z.boolean().default(false),
  }),
  payout: z.object({
    bankName: z.string().trim().min(1, "Bank name is required"),
    iban: z.string().trim().min(5, "Please provide a valid IBAN").max(50),
    accountName: z.string().trim().min(1, "Account name is required"),
  }),
  documents: z
    .array(
      z.object({
        name: z.string().trim().min(1),
        kind: z.enum([
          "COMMERCIAL_REGISTRY",
          "OWNER_ID",
          "TRANSPORT_LICENSE",
          "INSURANCE",
          "OTHER",
        ]),
      }),
    )
    .max(6)
    .optional(),
});