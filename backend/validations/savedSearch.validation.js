import { z } from "zod";
import { idParamSchema, isoDate } from "./common.validation.js";

const criteria = z.object({
  location: z.string().trim().max(100).default(""),
  type: z.array(z.enum(["SEDAN", "SUV", "HATCHBACK", "LUXURY", "VAN", "PICKUP"])).max(6).default([]),
  transmission: z.enum(["", "MANUAL", "AUTOMATIC"]).default(""),
  fuelType: z.enum(["", "GASOLINE", "DIESEL", "ELECTRIC", "HYBRID"]).default(""),
  maxPrice: z.number().min(0).max(100000).nullable().default(null),
  startDate: isoDate.nullable().default(null),
  endDate: isoDate.nullable().default(null),
}).strict().refine((value) => !value.startDate || !value.endDate || new Date(value.startDate) < new Date(value.endDate), {
  message: "End date must be after start date",
  path: ["endDate"],
});

export const createSavedSearchSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(80),
    criteria,
    alertsEnabled: z.boolean().default(true),
  }).strict(),
});

export const updateSavedSearchSchema = z.object({
  params: idParamSchema().shape.params,
  body: z.object({ name: z.string().trim().min(1).max(80).optional(), alertsEnabled: z.boolean().optional() }).strict().refine((value) => Object.keys(value).length > 0, "At least one field is required"),
});

export const savedSearchIdSchema = idParamSchema();
