import { z } from "zod";
import { objectId, ciEnum, idParamSchema } from "./common.validation.js";

const VEHICLE_TYPES = ["SEDAN", "SUV", "HATCHBACK", "LUXURY", "VAN", "PICKUP"];
const TRANSMISSIONS = ["MANUAL", "AUTOMATIC"];
const FUEL_TYPES = ["GASOLINE", "DIESEL", "ELECTRIC", "HYBRID"];
const OPERATIONAL_STATUSES = ["AVAILABLE", "MAINTENANCE", "SUSPENDED"];
const LISTING_STATUSES = ["DRAFT", "PUBLISHED", "SUSPENDED"];

// Multer/resize middleware may hand us either a single filename or an array
const imageField = z.union([z.array(z.string()), z.string()]).optional();

const createVehicleBody = z.object({
  make: z.string().trim().min(1, "vehicle make is required").max(100),
  model: z.string().trim().min(1, "vehicle model is required").max(100),
  plateNumber: z.string().trim().max(30).optional(),
  vin: z.string().trim().max(17).optional(),
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
  odometer: z.preprocess((v) => (v === "" ? null : v), z.coerce.number().min(0).nullable().optional()),
  engine: z.string().trim().max(100).optional(),
  drivetrain: z.string().trim().max(50).optional(),
  exteriorColor: z.string().trim().max(50).optional(),
  interiorColor: z.string().trim().max(50).optional(),
  tankCapacity: z.preprocess((v) => (v === "" ? null : v), z.coerce.number().min(0).nullable().optional()),
  features: z.preprocess(
    (v) => typeof v === "string" ? v.split(",").map((item) => item.trim()).filter(Boolean) : v,
    z.array(z.string().trim().min(1).max(80)).max(30).optional(),
  ),
  dailyPrice: z.coerce
    .number()
    .min(0, "daily rental price cannot be negative"),
  // Multipart form data cannot transport a literal JSON null, so a cleared
  // weekly rate is also conveyed as an empty string and normalised here.
  weeklyPrice: z.preprocess(
    (v) => (v === "" ? null : v),
    z.coerce.number().min(0).nullable().optional(),
  ),
  monthlyPrice: z.preprocess((v) => (v === "" ? null : v), z.coerce.number().min(0).nullable().optional()),
  depositAmount: z.preprocess((v) => (v === "" ? 0 : v), z.coerce.number().min(0).optional()),
  mileageLimit: z.preprocess((v) => (v === "" ? null : v), z.coerce.number().min(0).nullable().optional()),
  extraMileageFee: z.preprocess((v) => (v === "" ? null : v), z.coerce.number().min(0).nullable().optional()),
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
  lng: z.coerce.number().min(-180).max(180).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  // Only honoured by the controller for admins; tenant company is resolved server-side
  companyId: objectId.optional(),
});

export const createVehicleSchema = z.object({ body: createVehicleBody });

// `companyId` is deliberately absent from the update contract. `.partial()`
// alone would carry it over from createVehicleBody, letting a company user PATCH
// `{"companyId": "<competitor>"}` and move one of their vehicles into another
// tenant's fleet, redirecting its bookings and payouts. Ownership is immutable
// after creation; a deliberate transfer needs its own audited flow.
export const updateVehicleSchema = z.object({
  body: createVehicleBody.partial().omit({ companyId: true }),
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
