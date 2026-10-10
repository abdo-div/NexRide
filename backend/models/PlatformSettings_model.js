import mongoose from "mongoose";

/**
 * Single-document platform configuration registry for the Settings &
 * Governance surface (/admin/settings). One document ("platform") holds every
 * editable policy the operator surface persists; the version counter + savedBy
 * snapshot keep an honest audit trail, and any change is secured by a
 * SHA-256 registry hash computed by settingsService.
 *
 * Defaults here mirror the real runtime constants where they exist:
 *  - commission.standardRatePct 8  -> booking/payment pre-save fallback
 *    (company.customCommissionRate ?? 8)
 *  - booking.reservationExpiryMinutes 10 -> reservationHold HOLD_TTL_SECONDS
 *  - supportEmail bootstrap from EMAIL_FROM (see settingsService upsert)
 */
const platformSettingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: "platform",
      unique: true,
      index: true,
    },

    general: {
      brandName: { type: String, trim: true, maxlength: 80, default: "NexRide" },
      tradeEntity: { type: String, trim: true, maxlength: 120, default: "" },
      supportEmail: { type: String, trim: true, maxlength: 120, default: "" },
      hotline: { type: String, trim: true, maxlength: 40, default: "" },
      timezone: {
        type: String,
        enum: {
          values: ["Africa/Tripoli", "Africa/Cairo", "Europe/Rome"],
          message: "Unsupported operational timezone",
        },
        default: "Africa/Tripoli",
      },
      language: {
        type: String,
        enum: { values: ["ar", "en"], message: "Language must be ar or en" },
        default: "ar",
      },
    },

    booking: {
      freeCancellationHours: {
        type: Number,
        enum: { values: [12, 24, 48], message: "Invalid cancellation window" },
        default: 24,
      },
      latePenaltyPct: {
        type: Number,
        enum: { values: [25, 50, 100], message: "Invalid late penalty" },
        default: 50,
      },
      escrowReleaseHours: {
        type: Number,
        enum: {
          values: [12, 24, 48],
          message: "Invalid escrow release window",
        },
        default: 24,
      },
      // Runtime reservation hold is 10 minutes (reservationHold.service.js HOLD_TTL_SECONDS).
      reservationExpiryMinutes: {
        type: Number,
        enum: {
          values: [10, 30, 60, 120],
          message: "Invalid reservation expiry",
        },
        default: 10,
      },
    },

    commission: {
      // Real platform fallback: company.customCommissionRate ?? 8
      standardRatePct: {
        type: Number,
        min: [0, "Commission cannot be negative"],
        max: [40, "Commission cannot exceed 40%"],
        default: 8,
      },
      payoutSchedule: {
        type: String,
        trim: true,
        maxlength: 60,
        default: "Weekly on Thursdays",
      },
      minPayoutThreshold: {
        type: Number,
        min: [0, "Threshold cannot be negative"],
        max: [10000000, "Threshold out of range"],
        default: 1000,
      },
      clearingBank: {
        type: String,
        trim: true,
        maxlength: 80,
        default: "Libyan Foreign Bank (LFB)",
      },
    },

    telemetry: {
      smsDispatchEnabled: { type: Boolean, default: true },
      maintenanceAlertsEnabled: { type: Boolean, default: true },
      settlementEscalationEnabled: { type: Boolean, default: true },
      geofenceEnabled: { type: Boolean, default: true },
    },

    emergency: {
      bookingFreeze: { type: Boolean, default: false },
      maintenanceMode: { type: Boolean, default: false },
    },

    version: {
      type: Number,
      default: 1,
      min: [1, "Config version cannot go below 1"],
    },
    savedBy: {
      type: String,
      trim: true,
      maxlength: 120,
      default: "",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: false },
    toObject: { virtuals: false },
    autoIndex: process.env.NODE_ENV !== "production",
  },
);

const PlatformSettings = mongoose.model(
  "PlatformSettings",
  platformSettingsSchema,
);

export default PlatformSettings;