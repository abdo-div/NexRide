import crypto from "crypto";
import PlatformSettings from "../models/PlatformSettings_model.js";
import Vehicle from "../models/vehicle_model.js";
import Company from "../models/Company_model.js";
import Booking from "../models/booking_model.js";
import User from "../models/User_model.js";
import { buildPayoutSummary } from "./payoutService.js";

/**
 * Platform Settings & Governance service (/admin/settings).
 *
 * The registry is a single PlatformSettings document. Every editable field on
 * the Settings page is persisted here (versioned + signed with the operator
 * snapshot), and the surrounding governance block is computed live from the
 * real registries (fleet, partners, booking, payment ledger, admin accounts and
 * the Moamalat environment) so nothing on the page is fabricated.
 */

const ENUM_NUMBERS = {
  freeCancellationHours: [12, 24, 48],
  latePenaltyPct: [25, 50, 100],
  escrowReleaseHours: [12, 24, 48],
  reservationExpiryMinutes: [10, 30, 60, 120],
};

const NUM_BOUNDS = {
  standardRatePct: [0, 40],
  minPayoutThreshold: [0, 10_000_000],
};

const ENUM_STRINGS = {
  timezone: ["Africa/Tripoli", "Africa/Cairo", "Europe/Rome"],
  language: ["ar", "en"],
};

const STRING_LIMITS = {
  brandName: 80,
  tradeEntity: 120,
  supportEmail: 120,
  hotline: 40,
  payoutSchedule: 60,
  clearingBank: 80,
};

const BOOLEAN_KEYS = {
  smsDispatchEnabled: true,
  maintenanceAlertsEnabled: true,
  settlementEscalationEnabled: true,
  geofenceEnabled: true,
  bookingFreeze: true,
  maintenanceMode: true,
};

/** Discover + bootstrap the singleton registry document. */
const loadSettings = async () => {
  let doc = await PlatformSettings.findOne({ key: "platform" });
  if (!doc) {
    doc = await PlatformSettings.create({
      key: "platform",
      general: {
        brandName: "NexRide",
        tradeEntity: "",
        supportEmail: process.env.EMAIL_FROM || "",
        hotline: "",
        timezone: "Africa/Tripoli",
        language: "ar",
      },
    });
  }
  return doc;
};

/** Stable serialization of the persisted fields -> SHA-256 registry hash. */
export const registryHash = (settings) => {
  const payload = JSON.stringify({
    general: settings.general,
    booking: settings.booking,
    commission: settings.commission,
    telemetry: settings.telemetry,
    emergency: settings.emergency,
    version: settings.version,
  });
  const hash = crypto.createHash("sha256").update(payload).digest("hex");
  return {
    hash,
    short: `${hash.slice(0, 4).toUpperCase()}..${hash.slice(-4).toUpperCase()}`,
  };
};

const masked = (value, tail = 4) => {
  if (!value || typeof value !== "string") return null;
  const end = value.length > tail ? `***${value.slice(-tail)}` : "***";
  return end;
};

const browserLabel = (ua) => {
  if (!ua) return "Unknown client";
  const chrome = ua.match(/Chrome\/([\d.]+)/);
  if (chrome) return `Chrome ${chrome[1]}`;
  const firefox = ua.match(/Firefox\/([\d.]+)/);
  if (firefox) return `Firefox ${firefox[1]}`;
  const safari = ua.match(/Version\/([\d.]+).*Safari/);
  if (safari) return `Safari ${safari[1]}`;
  return ua.split(" ").slice(0, 2).join(" ");
};

const buildGateways = () => {
  const mid = process.env.MOAMALAT_MID || "";
  const secure = process.env.MOAMALAT_SECURE_KEY || "";
  const env = process.env.MOAMALAT_ENV || "";
  const enabled = Boolean(mid && secure);
  const mode =
    !enabled ? "disabled" : env === "production" ? "production" : "sandbox";
  return {
    moamalat: {
      enabled,
      env: env || "unset",
      mode,
      merchantIdMasked: masked(mid),
      terminalIdMasked: masked(process.env.MOAMALAT_TID),
    },
    sadad: { enabled: false },
    tadawul: { enabled: false },
  };
};

const buildGovernance = async (req) => {
  const [fleetSize, approvedPartners, partnerTotal, activeOnRoad, payout] =
    await Promise.all([
      Vehicle.countDocuments(),
      Company.countDocuments({ status: "APPROVED" }),
      Company.countDocuments(),
      Booking.countDocuments({
        bookingStatus: { $in: ["ACTIVE", "CONFIRMED"] },
      }),
      buildPayoutSummary(),
    ]);

  const admins = await User.find({ role: "admin" })
    .select("name email phoneNumber status")
    .lean();

  const ADMIN_STATUSES = ["ACTIVE", "SUSPENDED", "BANNED"];
  const safeStatus = (value) =>
    ADMIN_STATUSES.includes(value) ? value : "ACTIVE";

  return {
    fleetSize,
    approvedPartners,
    partnerTotal,
    activeOnRoad,
    effectiveTakeRate: payout.effectiveRate,
    pendingPayouts: payout.pendingPayouts,
    settledPayouts: payout.paidPayouts,
    admins: admins.map((u) => ({
      _id: String(u._id),
      name: u.name,
      email: u.email,
      phoneNumber: u.phoneNumber || "",
      status: safeStatus(u.status),
    })),
    session: {
      ip: req.ip || req.socket?.remoteAddress || "-",
      browser: browserLabel(req.headers?.["user-agent"]),
      userAgent: req.headers?.["user-agent"] || "",
    },
  };
};

const cleanSettings = (doc) => ({
  general: {
    brandName: doc.general.brandName,
    tradeEntity: doc.general.tradeEntity,
    supportEmail: doc.general.supportEmail,
    hotline: doc.general.hotline,
    timezone: doc.general.timezone,
    language: doc.general.language,
  },
  booking: {
    freeCancellationHours: doc.booking.freeCancellationHours,
    latePenaltyPct: doc.booking.latePenaltyPct,
    escrowReleaseHours: doc.booking.escrowReleaseHours,
    reservationExpiryMinutes: doc.booking.reservationExpiryMinutes,
  },
  commission: {
    standardRatePct: doc.commission.standardRatePct,
    payoutSchedule: doc.commission.payoutSchedule,
    minPayoutThreshold: doc.commission.minPayoutThreshold,
    clearingBank: doc.commission.clearingBank,
  },
  telemetry: {
    smsDispatchEnabled: doc.telemetry.smsDispatchEnabled,
    maintenanceAlertsEnabled: doc.telemetry.maintenanceAlertsEnabled,
    settlementEscalationEnabled: doc.telemetry.settlementEscalationEnabled,
    geofenceEnabled: doc.telemetry.geofenceEnabled,
  },
  emergency: {
    bookingFreeze: doc.emergency.bookingFreeze,
    maintenanceMode: doc.emergency.maintenanceMode,
  },
  version: doc.version,
  savedBy: doc.savedBy,
  updatedAt: doc.updatedAt?.toISOString() || null,
});

const buildPayload = async (req) => {
  const doc = await loadSettings();
  const settings = cleanSettings(doc);
  const [gateways, governance] = await Promise.all([
    buildGateways(),
    buildGovernance(req),
  ]);
  return {
    settings,
    registry: { key: "platform", ...registryHash(settings) },
    gateways,
    governance,
  };
};

/** Validate + apply a partial settings patch against the persisted doc. */
const applyPatch = (doc, patch, operator) => {
  const types = {
    general: ["brandName", "tradeEntity", "supportEmail", "hotline", "timezone", "language"],
    booking: Object.keys(ENUM_NUMBERS),
    commission: ["standardRatePct", "payoutSchedule", "minPayoutThreshold", "clearingBank"],
    telemetry: Object.keys(BOOLEAN_KEYS).filter(
      (k) => !["bookingFreeze", "maintenanceMode"].includes(k),
    ),
    emergency: ["bookingFreeze", "maintenanceMode"],
  };

  for (const [section, incoming] of Object.entries(patch || {})) {
    if (!incoming || typeof incoming !== "object" || !types[section]) continue;
    for (const [field, raw] of Object.entries(incoming)) {
      const target = doc[section];
      if (!target || !types[section].includes(field) || raw === undefined)
        continue;

      if (BOOLEAN_KEYS[field]) {
        target[field] = raw === true || raw === "true";
        continue;
      }

      if (ENUM_NUMBERS[field]) {
        const num = Number(raw);
        if (Number.isFinite(num) && ENUM_NUMBERS[field].includes(num)) {
          target[field] = num;
        }
        continue;
      }

      if (NUM_BOUNDS[field]) {
        const num = Number(raw);
        if (Number.isFinite(num)) {
          const [lo, hi] = NUM_BOUNDS[field];
          target[field] = Math.round(
            Math.min(hi, Math.max(lo, num)) * 10,
          ) / 10;
        }
        continue;
      }

      if (ENUM_STRINGS[field]) {
        const val = String(raw).trim();
        if (ENUM_STRINGS[field].includes(val)) target[field] = val;
        continue;
      }

      if (typeof STRING_LIMITS[field] === "number") {
        target[field] = String(raw).trim().slice(0, STRING_LIMITS[field]);
        continue;
      }
    }
  }

  doc.version = (doc.version || 1) + 1;
  doc.savedBy = operator || "Unknown operator";
  doc.markModified("general");
  doc.markModified("booking");
  doc.markModified("commission");
  doc.markModified("telemetry");
  doc.markModified("emergency");
  return doc;
};

/** GET /admin/settings — full registry + live governance snapshot. */
export const fetchPlatformSettings = async (req) => buildPayload(req);

/** PATCH /admin/settings — persist partial sections or reset to defaults. */
export const updatePlatformSettings = async (req, patch) => {
  const doc = await loadSettings();
  const operator = req.user?.name
    ? `${req.user.name} <${req.user.email || req.user.name}>`
    : "Unknown operator";

  if (patch?.reset === true) {
    doc.general = {
      brandName: "NexRide",
      tradeEntity: "",
      supportEmail: process.env.EMAIL_FROM || "",
      hotline: "",
      timezone: "Africa/Tripoli",
      language: "ar",
    };
    doc.booking = {
      freeCancellationHours: 24,
      latePenaltyPct: 50,
      escrowReleaseHours: 24,
      reservationExpiryMinutes: 10,
    };
    doc.commission = {
      standardRatePct: 8,
      payoutSchedule: "Weekly on Thursdays",
      minPayoutThreshold: 1000,
      clearingBank: "Libyan Foreign Bank (LFB)",
    };
    doc.telemetry = {
      smsDispatchEnabled: true,
      maintenanceAlertsEnabled: true,
      settlementEscalationEnabled: true,
      geofenceEnabled: true,
    };
    doc.emergency = { bookingFreeze: false, maintenanceMode: false };
    doc.version = (doc.version || 1) + 1;
    doc.savedBy = operator;
    doc.markModified("general");
    doc.markModified("booking");
    doc.markModified("commission");
    doc.markModified("telemetry");
    doc.markModified("emergency");
  } else {
    applyPatch(doc, patch, operator);
  }

  await doc.save();
  return buildPayload(req);
};