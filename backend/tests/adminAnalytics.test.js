import assert from "node:assert/strict";
import { test } from "node:test";
import Booking from "../models/booking_model.js";
import Company from "../models/Company_model.js";
import Payment from "../models/payment_model.js";
import Vehicle from "../models/vehicle_model.js";
import { buildAnalyticsSummary } from "../services/analyticsService.js";

test("analytics totals derive from completed payments and booking funnel rows", async (t) => {
  const companyId = "aaaaaaaaaaaaaaaaaaaaaaaa";
  const bookingAggregates = [
    [
      { _id: "COMPLETED", count: 2, totalDays: 5, sumAmount: 500 },
      { _id: "CANCELLED", count: 1, totalDays: 0, sumAmount: 0 },
      { _id: "CONFIRMED", count: 1, totalDays: 2, sumAmount: 200 },
    ],
    [{ _id: "2026-10-01", count: 2 }],
    [{ _id: "customer-1" }, { _id: "customer-2" }],
    [
      { _id: "customer-1", first: new Date(2026, 0, 1) },
      { _id: "customer-2", first: new Date(2026, 9, 1) },
    ],
    [],
    [{ _id: companyId, total: 4, completed: 2, activeNow: 1 }],
    [],
    [],
    [{ _id: null, count: 4 }],
  ];
  const paymentAggregates = [
    [{
      gross: 1000,
      cut: 100,
      net: 900,
      tx: 2,
      settledShare: 600,
      pendingShare: 300,
      customers: ["customer-1", "customer-2"],
    }],
    [{ amount: 50, tx: 1 }],
    [],
    [{ gross: 1000, customers: ["customer-1", "customer-2"] }],
    [{ name: "Renter", spend: 700, trips: 2 }],
    [{
      _id: companyId,
      name: "Partner",
      city: "Tripoli",
      status: "APPROVED",
      bookings: 2,
      gross: 1000,
      cut: 100,
    }],
    [],
  ];
  let bookingWindow;

  t.mock.method(Vehicle, "aggregate", async () => [{ total: 10, available: 7, maintenance: 2, unavailable: 1, published: 9 }]);
  t.mock.method(Company, "aggregate", async () => [{ total: 3, approved: 2 }]);
  t.mock.method(Booking, "aggregate", async (pipeline) => {
    bookingWindow ??= pipeline[0].$match.$and[0].createdAt;
    return bookingAggregates.shift() ?? [];
  });
  t.mock.method(Payment, "aggregate", async () => paymentAggregates.shift() ?? []);

  const summary = await buildAnalyticsSummary({ period: "30d" });

  assert.equal(summary.period.label, "30d");
  assert.ok(bookingWindow.$gte instanceof Date);
  assert.ok(bookingWindow.$lte instanceof Date);
  assert.ok(bookingWindow.$gte < bookingWindow.$lte);
  assert.ok(bookingWindow.$lte >= new Date());
  assert.equal(summary.funnel.total, 4);
  assert.equal(summary.funnel.completed, 2);
  assert.equal(summary.funnel.cancelled, 1);
  assert.equal(summary.funnel.activeOnRoad, 1);
  assert.equal(summary.financial.gross, 1000);
  assert.equal(summary.financial.cut, 100);
  assert.equal(summary.financial.takeRate, 10);
  assert.equal(summary.financial.avgTicket, 500);
  assert.deepEqual(summary.financial.refunds, { amount: 50, tx: 1 });
  assert.ok(Math.abs(summary.clearing.healthPct - 200 / 3) < 1e-10);
  assert.equal(summary.renters.active, 2);
  assert.equal(summary.renters.new, 1);
  assert.equal(summary.renters.returning, 1);
  assert.equal(summary.topCompanies[0].avgTicket, 500);
  assert.equal(summary.topCompanies[0].completionPct, 50);
  assert.deepEqual(bookingAggregates, []);
  assert.deepEqual(paymentAggregates, []);
});

test("analytics returns zero-safe totals for empty datasets", async (t) => {
  t.mock.method(Vehicle, "aggregate", async () => []);
  t.mock.method(Company, "aggregate", async () => []);
  t.mock.method(Booking, "aggregate", async () => []);
  t.mock.method(Payment, "aggregate", async () => []);

  const summary = await buildAnalyticsSummary({ period: "7d" });

  assert.equal(summary.period.label, "7d");
  assert.equal(summary.fleet.size, 0);
  assert.equal(summary.funnel.total, 0);
  assert.equal(summary.funnel.completionPct, 0);
  assert.equal(summary.financial.gross, 0);
  assert.equal(summary.financial.avgTicket, 0);
  assert.equal(summary.clearing.healthPct, 0);
  assert.equal(summary.renters.active, 0);
  assert.equal(summary.renters.ltv, 0);
  assert.equal(summary.funnel.peakDay, null);
});
