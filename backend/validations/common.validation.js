import { z } from "zod";

/**
 * Reusable MongoDB ObjectId string (24 hex characters)
 */
export const objectId = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid MongoDB ObjectId format");

/**
 * Accepts full ISO-8601 datetimes as well as date-only strings (e.g. 2026-09-20)
 */
export const isoDate = z
  .string()
  .refine((value) => !Number.isNaN(new Date(value).getTime()), {
    message: "Invalid date format (ISO 8601 expected)",
  });

/**
 * Case-insensitive enum helper. Normalizes to upper-case before validating so
 * values such as "sedan" or "available" match the model enums stored in MongoDB.
 */
export const ciEnum = (values, message) =>
  z
    .string()
    .transform((value) => value.toUpperCase())
    .refine((value) => values.includes(value), {
      message: message || `Must be one of: ${values.join(", ")}`,
    });

/**
 * Builds a { params: { <name> } } schema for parameterized routes.
 */
export const idParamSchema = (paramName = "id") =>
  z.object({
    params: z.object({ [paramName]: objectId }),
  });
