import PlatformSettings from "../models/PlatformSettings_model.js";
import mongoose from "mongoose";

export const DEFAULT_PLATFORM_POLICY = Object.freeze({
  commissionRatePct: 8,
  minimumPayout: 1000,
  freeCancellationHours: 48,
  reservationExpiryMinutes: 30,
});

/** Read runtime policy without creating or mutating the settings registry. */
export const getPlatformPolicy = async () => {
  if (mongoose.connection.readyState === 0) {
    return { ...DEFAULT_PLATFORM_POLICY };
  }
  try {
    const settings = await PlatformSettings.findOne({ key: "platform" })
      .select(
        "commission.standardRatePct commission.minPayoutThreshold booking.freeCancellationHours booking.reservationExpiryMinutes",
      )
      .lean();

    return {
      commissionRatePct:
        settings?.commission?.standardRatePct ??
        DEFAULT_PLATFORM_POLICY.commissionRatePct,
      minimumPayout:
        settings?.commission?.minPayoutThreshold ??
        DEFAULT_PLATFORM_POLICY.minimumPayout,
      freeCancellationHours:
        settings?.booking?.freeCancellationHours ??
        DEFAULT_PLATFORM_POLICY.freeCancellationHours,
      reservationExpiryMinutes:
        settings?.booking?.reservationExpiryMinutes ??
        DEFAULT_PLATFORM_POLICY.reservationExpiryMinutes,
    };
  } catch {
    return { ...DEFAULT_PLATFORM_POLICY };
  }
};
