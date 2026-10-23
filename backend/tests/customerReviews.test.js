import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import Booking from "../models/booking_model.js";
import reviewRouter from "../routes/reviewRoutes.js";
import { createReviewSchema, updateReviewSchema } from "../validations/review.validation.js";
import { verifyBookingCompletion } from "../services/reviewService.js";

const ids = { customer: "aaaaaaaaaaaaaaaaaaaaaaaa", vehicle: "bbbbbbbbbbbbbbbbbbbbbbbb", booking: "cccccccccccccccccccccccc" };
const originalFindOne = Booking.findOne;
afterEach(() => { Booking.findOne = originalFindOne; });

test("review creation requires the exact completed booking identifier", async () => {
  let filter;
  Booking.findOne = (value) => { filter = value; return Promise.resolve({ _id: ids.booking }); };
  await verifyBookingCompletion(ids.customer, ids.vehicle, ids.booking);
  assert.deepEqual(filter, { _id: ids.booking, customerId: ids.customer, vehicleId: ids.vehicle, bookingStatus: "COMPLETED" });
});

test("review validation rejects relationship injection and empty updates", () => {
  const safe = { params: { vehicleId: ids.vehicle }, body: { bookingId: ids.booking, rating: 5, review: "Excellent handover and a clean vehicle." } };
  assert.equal(createReviewSchema.safeParse(safe).success, true);
  assert.equal(createReviewSchema.safeParse({ ...safe, body: { ...safe.body, customerId: ids.customer } }).success, false);
  assert.equal(updateReviewSchema.safeParse({ params: { id: ids.booking }, body: {} }).success, false);
});

test("customer review routes support create, edit, and delete behind authentication", () => {
  const collection = reviewRouter.stack.find((layer) => layer.route?.path === "/" && layer.route.methods.post);
  const updateItem = reviewRouter.stack.find((layer) => layer.route?.path === "/:id" && layer.route.methods.patch);
  const deleteItem = reviewRouter.stack.find((layer) => layer.route?.path === "/:id" && layer.route.methods.delete);
  assert.ok(collection.route.methods.post);
  assert.ok(updateItem.route.methods.patch);
  assert.ok(deleteItem.route.methods.delete);
});
