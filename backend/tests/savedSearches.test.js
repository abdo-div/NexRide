import assert from "node:assert/strict";
import { test } from "node:test";
import SavedSearch from "../models/SavedSearch_model.js";
import savedSearchRouter from "../routes/savedSearchRoutes.js";
import { protect } from "../middlewares/authMiddleware.js";
import { createSavedSearchSchema, updateSavedSearchSchema } from "../validations/savedSearch.validation.js";
import { matchesSavedSearch } from "../services/savedSearchService.js";

const validBody = {
  name: "Tripoli SUVs",
  criteria: {
    location: "Tripoli",
    type: ["SUV"],
    transmission: "AUTOMATIC",
    fuelType: "GASOLINE",
    maxPrice: 250,
    startDate: "2026-11-01",
    endDate: "2026-11-05",
  },
  alertsEnabled: true,
};

test("saved-search routes are protected and customer-only", async () => {
  assert.equal(savedSearchRouter.stack[0].handle, protect);
  const roleGuard = savedSearchRouter.stack[1].handle;
  const error = await new Promise((resolve) => roleGuard({ user: { role: "company" } }, {}, resolve));
  assert.equal(error.statusCode, 403);
  const collectionRoute = savedSearchRouter.stack.find((layer) => layer.route?.path === "/");
  const itemRoute = savedSearchRouter.stack.find((layer) => layer.route?.path === "/:id");
  assert.ok(collectionRoute.route.methods.get && collectionRoute.route.methods.post);
  assert.ok(itemRoute.route.methods.patch && itemRoute.route.methods.delete);
});

test("saved-search validation accepts safe criteria and rejects unknown account fields", () => {
  assert.equal(createSavedSearchSchema.safeParse({ body: validBody }).success, true);
  assert.equal(createSavedSearchSchema.safeParse({ body: { ...validBody, role: "admin" } }).success, false);
  assert.equal(updateSavedSearchSchema.safeParse({ params: { id: "507f1f77bcf86cd799439011" }, body: { alertsEnabled: false } }).success, true);
  assert.equal(updateSavedSearchSchema.safeParse({ params: { id: "507f1f77bcf86cd799439011" }, body: {} }).success, false);
});

test("saved-search schema enforces one name per customer and alert lookup indexes", () => {
  const indexes = SavedSearch.schema.indexes();
  const uniqueName = indexes.find(([fields]) => fields.customerId === 1 && fields.name === 1);
  const alertIndex = indexes.find(([fields]) => fields.alertsEnabled === 1);
  assert.equal(uniqueName?.[1].unique, true);
  assert.ok(alertIndex);
  assert.ok(SavedSearch.schema.path("criteria.maxPrice"));
});

test("vehicle alerts match every active discovery filter", () => {
  const vehicle = { city: "Tripoli", pickupLocation: "Airport", type: "SUV", transmission: "AUTOMATIC", fuelType: "GASOLINE", dailyPrice: 220 };
  assert.equal(matchesSavedSearch(validBody.criteria, vehicle), true);
  assert.equal(matchesSavedSearch({ ...validBody.criteria, location: "Benghazi" }, vehicle), false);
  assert.equal(matchesSavedSearch({ ...validBody.criteria, type: ["SEDAN"] }, vehicle), false);
  assert.equal(matchesSavedSearch({ ...validBody.criteria, maxPrice: 200 }, vehicle), false);
});
