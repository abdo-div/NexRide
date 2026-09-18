import { z } from "zod";
import { objectId, ciEnum, idParamSchema } from "./common.validation.js";

const VEHICLE_TYPES = ["SEDAN", "SUV", "HATCHBACK", "LUXURY", "VAN", "PICKUP"];
const TRANSMISSIONS = ["MANUAL", "AUTOMATIC"];
const FUEL_TYPES = ["GASOLINE", "DIESEL", "ELECTRIC", "HYBRID"];
const OPERATIONAL_STATUSES = ["AVAILABLE", "MAINTENANCE", "UNAVAILABLE"];
const LISTING_STATUSES = ["DRAFT", "PUBLISHED", "SUSPENDED"];

// Multer/resize middleware may hand us either a single filename or an array
const imageField = z.union([z.array(z.string()), z.string()]).optional();

const createVehicleBody = z.object({
  make: z.string().trim().min(1, "vehicle make is required").max(100),
  model: z.string().trim().min(1, "vehicle model is required").max(100),
  year: z.coerce
    .number()
    .int()
    .min(1900, "vehicle year cannot be before 1900")
    .max(new Date().getFullYear() + 1, "vehicle year cannot be in the future"),
  type: ciEnum(VEHICLE_TYPES, "invalid vehicle type"),
  transmission: ciEnum(TRANSMISSIONS, "invalid transmission type"),
  fuelType: ciEnum(FUEL_TYPES, "invalid fuel type"),
  seats: z.coerce.number().int().min(1).max(20),
  doors: z.coerce.number().int().min(1).max(10).optional(),
  description: z.string().trim().max(500).optional(),
  dailyPrice: z.coerce
    .number()
    .min(0, "daily rental price cannot be negative"),
  weeklyPrice: z.coerce.number().min(0).nullable().optional(),
  city: z.string().trim().min(1, "city location is required").max(100),
  pickupLocation: z
    .string()
    .trim()
    .min(1, "specific pickup address or branch is required")
    .max(300),
  operationalStatus: ciEnum(OPERATIONAL_STATUSES, "invalid operational status").optional(),
  listingStatus: ciEnum(LISTING_STATUSES, "invalid listing status").optional(),
  photos: z.array(z.string()).optional(),
  imageCover: z.string().optional(),
  images: imageField,
  // GeoJSON coordinates supplied as separate multipart fields
  lng: z.coerce.number().optional(),
  lat: z.coerce.number().optional(),
  // Only honoured by the controller for admins; tenant company is resolved server-side
  companyId: objectId.optional(),
});

export const createVehicleSchema = z.object({ body: createVehicleBody });

export const updateVehicleSchema = z.object({
  body: createVehicleBody.partial(),
});

export const updateVehicleStatusSchema = z.object({
  body: z.object({
    status: ciEnum(
      [...OPERATIONAL_STATUSES, ...LISTING_STATUSES],
      "Invalid vehicle status",
    ),
    statusType: ciEnum(
      ["OPERATIONAL", "LISTING"],
      "statusType must be operational or listing",
    ).optional(),
  }),
});

export const vehicleIdParamSchema = idParamSchema("id");
