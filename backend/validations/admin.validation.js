import { z } from "zod";
import { objectId, isoDate, ciEnum } from "./common.validation.js";

const optionalText = (max) => z.string().trim().max(max).optional();

export const payoutDispatchSchema = z.object({
  body: z.object({
    companyIds: z.array(objectId).max(500).optional(),
  }).strict(),
});

export const payoutSettleSchema = z.object({
  body: z.object({ companyId: objectId.optional() }).strict(),
});

export const createMaintenanceSchema = z.object({
  body: z.object({
    vehicleId: objectId,
    category: ciEnum(["ROUTINE_SERVICE", "OIL_FILTER", "TIRES", "BRAKES", "DIAGNOSTICS", "BALLISTIC_ARMOR", "DETAILING", "OTHER"]),
    serviceType: ciEnum(["OIL_CHANGE", "BRAKES", "TIRES", "ENGINE", "BODY_WORK", "PAPERWORK", "ROUTINE_INSPECTION", "OTHER"]).optional(),
    priority: ciEnum(["CRITICAL", "HIGH", "ROUTINE"]).optional(),
    status: ciEnum(["SCHEDULED", "IN_PROGRESS"]).optional(),
    triggerReason: z.string().trim().min(1).max(200),
    detail: optionalText(2000),
    workshop: optionalText(200),
    technician: optionalText(120),
    workshopName: optionalText(200),
    mechanicContact: optionalText(80),
    receiptUrl: z.string().trim().url().max(2048).optional().or(z.literal("")),
    intakeDate: isoDate.optional(),
    estReturnDate: isoDate.nullable().optional(),
    estCost: z.coerce.number().min(0).max(100_000_000).optional(),
    cost: z.coerce.number().min(0).max(100_000_000).optional(),
    odometerAtService: z.coerce.number().min(0).nullable().optional(),
    nextServiceOdometer: z.coerce.number().min(0).nullable().optional(),
    costLines: z.array(z.object({
      label: z.string().trim().min(1).max(120),
      amount: z.coerce.number().min(0).max(100_000_000),
    }).strict()).max(100).optional(),
    dtcCodes: z.array(z.object({
      code: z.string().trim().min(1).max(40),
      description: z.string().trim().max(300).optional(),
    }).strict()).max(100).optional(),
  }).strict(),
});

export const updateOdometerSchema = z.object({
  body: z.object({
    vehicleId: objectId,
    currentOdometer: z.coerce.number().min(0).max(10_000_000),
  }).strict(),
});

const bool = z.boolean();
export const platformSettingsSchema = z.object({
  body: z.union([
    z.object({ reset: z.literal(true) }).strict(),
    z.object({
      general: z.object({
        brandName: optionalText(80), tradeEntity: optionalText(120),
        supportEmail: z.string().trim().email().max(120).optional(),
        hotline: optionalText(40),
        timezone: z.enum(["Africa/Tripoli", "Africa/Cairo", "Europe/Rome"]).optional(),
        language: z.enum(["ar", "en"]).optional(),
      }).strict().optional(),
      booking: z.object({
        freeCancellationHours: z.coerce.number().int().refine((v) => [12,24,48].includes(v)),
        latePenaltyPct: z.coerce.number().int().refine((v) => [25,50,100].includes(v)),
        escrowReleaseHours: z.coerce.number().int().refine((v) => [12,24,48].includes(v)),
        reservationExpiryMinutes: z.coerce.number().int().refine((v) => [10,30,60,120].includes(v)),
      }).partial().strict().optional(),
      commission: z.object({
        standardRatePct: z.coerce.number().min(0).max(40).optional(),
        payoutSchedule: optionalText(60),
        minPayoutThreshold: z.coerce.number().min(0).max(10_000_000).optional(),
        clearingBank: optionalText(80),
      }).strict().optional(),
      telemetry: z.object({
        smsDispatchEnabled: bool.optional(), maintenanceAlertsEnabled: bool.optional(),
        settlementEscalationEnabled: bool.optional(), geofenceEnabled: bool.optional(),
      }).strict().optional(),
      emergency: z.object({ bookingFreeze: bool.optional(), maintenanceMode: bool.optional() }).strict().optional(),
    }).strict().refine((value) => Object.keys(value).length > 0, "Provide at least one settings section"),
  ]),
});
