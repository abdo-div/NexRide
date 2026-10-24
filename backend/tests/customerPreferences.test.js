import assert from "node:assert/strict";
import { test } from "node:test";
import User from "../models/User_model.js";
import userRouter from "../routes/userRoutes.js";
import { protect } from "../middlewares/authMiddleware.js";
import { updateCustomerPreferencesSchema } from "../validations/user.validation.js";

const routes = (path, method) => userRouter.stack.filter((layer) => layer.route?.path === path && layer.route.methods[method]);

test("customer preferences are protected and customer-only", async () => {
  const protectIndex = userRouter.stack.findIndex((layer) => layer.handle === protect);
  const routeIndex = userRouter.stack.findIndex((layer) => layer.route?.path === "/me/preferences");
  assert.ok(protectIndex >= 0 && routeIndex > protectIndex);
  const getRoute = routes("/me/preferences", "get")[0];
  const roleGuard = getRoute.route.stack[0].handle;
  const error = await new Promise((resolve) => roleGuard({ user: { role: "company" } }, {}, resolve));
  assert.equal(error.statusCode, 403);
  assert.ok(routes("/me/preferences", "patch")[0].route.stack.length >= 3);
});

test("preference validation accepts a complete safe customer profile", () => {
  const result = updateCustomerPreferencesSchema.safeParse({ body: {
    preferredCity: "Tripoli",
    vehicleTypes: ["SUV", "LUXURY"],
    transmission: "AUTOMATIC",
    fuelType: "HYBRID",
    defaultRentalDays: 5,
    pickupTime: "09:30",
    returnTime: "18:00",
    paymentMethod: "CARD",
  } });
  assert.equal(result.success, true);
});

test("preference validation rejects unsafe ranges and unknown fields", () => {
  const result = updateCustomerPreferencesSchema.safeParse({ body: {
    preferredCity: "Tripoli",
    vehicleTypes: ["SUV"],
    transmission: "AUTOMATIC",
    fuelType: "HYBRID",
    defaultRentalDays: 90,
    pickupTime: "35:00",
    returnTime: "18:00",
    paymentMethod: "CARD",
    role: "admin",
  } });
  assert.equal(result.success, false);
});

test("user schema persists bounded rental preference defaults", () => {
  assert.ok(User.schema.path("preferences.preferredCity"));
  assert.equal(User.schema.path("preferences.defaultRentalDays").options.max, 30);
  assert.deepEqual(User.schema.path("preferences.paymentMethod").options.enum, ["CARD", "CASH_ON_DELIVERY"]);
});
