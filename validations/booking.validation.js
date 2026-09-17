import { z } from "zod";

export const createBookingSchema = z.object({
  body: z
    .object({
      vehicleId: z
        .string({ required_error: "Vehicle ID is required" })
        .regex(/^[0-9a-fA-F]{24}$/, "Invalid MongoDB ObjectId format"),
      startDate: z
        .string({ required_error: "Start date is required" })
        .datetime("Invalid start date format (ISO 8601 string expected)"),
      endDate: z
        .string({ required_error: "End date is required" })
        .datetime("Invalid end date format (ISO 8601 string expected)"),
      pickupLocation: z.string().optional(),
    })
    .refine((data) => new Date(data.endDate) > new Date(data.startDate), {
      message: "End date must be strictly after start date",
      path: ["endDate"],
    }),
});
