import assert from "node:assert/strict";
import { test } from "node:test";
import Booking from "../models/booking_model.js";
import Company from "../models/Company_model.js";
import Payment from "../models/payment_model.js";
import PlatformSettings from "../models/PlatformSettings_model.js";
import User from "../models/User_model.js";
import Vehicle from "../models/vehicle_model.js";
import { updatePlatformSettings } from "../services/settingsService.js";

const makeSettings = () => ({
  general: {
    brandName: "NexRide",
    tradeEntity: "NexRide LLC",
    supportEmail: "support@example.test",
    hotline: "12345",
    timezone: "Africa/Tripoli",
    language: "ar",
  },
  booking: {
    freeCancellationHours: 24,
    latePenaltyPct: 50,
    escrowReleaseHours: 24,
    reservationExpiryMinutes: 10,
  },
  commission: {
    standardRatePct: 8,
    payoutSchedule: "Weekly on Thursdays",
    minPayoutThreshold: 1000,
    clearingBank: "LFB",
  },
  telemetry: {
    smsDispatchEnabled: true,
    maintenanceAlertsEnabled: true,
    settlementEscalationEnabled: true,
    geofenceEnabled: true,
  },
  emergency: { bookingFreeze: false, maintenanceMode: false },
  version: 3,
  savedBy: "",
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  markModified() {},
  async save() {},
});

const mockGovernanceDependencies = (t) => {
  t.mock.method(Vehicle, "countDocuments", async () => 4);
  t.mock.method(Company, "countDocuments", async () => 2);
  t.mock.method(Booking, "countDocuments", async () => 1);
  t.mock.method(Payment, "aggregate", async () => []);
  t.mock.method(Payment, "countDocuments", async () => 0);
  t.mock.method(User, "find", () => ({
    select() {
      return this;
    },
    async lean() {
      return [];
    },
  }));
};

test("settings patch updates supplied valid fields and preserves omitted values", async (t) => {
  const doc = makeSettings();
  mockGovernanceDependencies(t);
  t.mock.method(PlatformSettings, "findOne", async () => doc);

  const result = await updatePlatformSettings(
    { user: { name: "Admin", email: "admin@example.test" } },
    {
      general: { brandName: "  NexRide Libya  " },
      booking: { freeCancellationHours: 36 },
      commission: { standardRatePct: 12.5 },
    },
  );

  assert.equal(doc.general.brandName, "NexRide Libya");
  assert.equal(doc.general.tradeEntity, "NexRide LLC");
  assert.equal(doc.booking.freeCancellationHours, 24);
  assert.equal(doc.commission.standardRatePct, 12.5);
  assert.equal(doc.version, 4);
  assert.equal(doc.savedBy, "Admin <admin@example.test>");
  assert.equal(result.settings.general.tradeEntity, "NexRide LLC");
});

test("settings patch does not apply invalid enum values and keeps untouched settings", async (t) => {
  const doc = makeSettings();
  mockGovernanceDependencies(t);
  t.mock.method(PlatformSettings, "findOne", async () => doc);

  await updatePlatformSettings(
    { user: { name: "Admin" } },
    {
      general: { timezone: "Mars/Olympus" },
      telemetry: { maintenanceAlertsEnabled: false },
    },
  );

  assert.equal(doc.general.timezone, "Africa/Tripoli");
  assert.equal(doc.telemetry.maintenanceAlertsEnabled, false);
  assert.equal(doc.telemetry.geofenceEnabled, true);
});
