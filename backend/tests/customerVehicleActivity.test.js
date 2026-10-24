import assert from "node:assert/strict";
import { test } from "node:test";
import CustomerVehicleActivity from "../models/CustomerVehicleActivity_model.js";
import activityRouter from "../routes/customerVehicleActivityRoutes.js";
import { protect } from "../middlewares/authMiddleware.js";

const route = (path, method) =>
  activityRouter.stack.find((layer) => layer.route?.path === path && layer.route.methods[method]);

test("customer vehicle activity routes are customer-only and validate writes", async () => {
  assert.equal(activityRouter.stack[0].handle, protect);
  const roleGuard = activityRouter.stack[1].handle;
  const error = await new Promise((resolve) =>
    roleGuard({ user: { role: "company" } }, {}, resolve),
  );
  assert.equal(error.statusCode, 403);
  assert.ok(route("/", "get"));
  assert.ok(route("/:vehicleId/favorite", "patch").route.stack.length > 1);
  assert.ok(route("/:vehicleId/view", "post").route.stack.length > 1);
});

test("activity schema prevents duplicate customer and vehicle rows", () => {
  const index = CustomerVehicleActivity.schema.indexes().find(
    ([fields]) => fields.customerId === 1 && fields.vehicleId === 1,
  );
  assert.ok(index);
  assert.equal(index[1].unique, true);
});

test("activity schema supports ordered favourite and recent lookups", () => {
  const indexes = CustomerVehicleActivity.schema.indexes();
  assert.ok(indexes.some(([fields]) => fields.customerId === 1 && fields.favorite === 1 && fields.favoritedAt === -1));
  assert.ok(indexes.some(([fields]) => fields.customerId === 1 && fields.lastViewedAt === -1));
});
