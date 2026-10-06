import assert from "node:assert/strict";
import { test } from "node:test";
import MaintenanceEvent from "../models/Maintenance_model.js";
import Vehicle from "../models/vehicle_model.js";
import Booking from "../models/booking_model.js";
import AppError from "../utils/appError.js";
import * as maintenanceService from "../services/maintenanceService.js";

const vehicleId = "aaaaaaaaaaaaaaaaaaaaaaaa";
const companyId = "bbbbbbbbbbbbbbbbbbbbbbbb";

const makeVehicle = (overrides = {}) => ({
  _id: vehicleId,
  companyId,
  operationalStatus: "AVAILABLE",
  async save() {},
  ...overrides,
});

const makeEvent = (overrides = {}) => ({
  _id: "cccccccccccccccccccccccc",
  id: "cccccccccccccccccccccccc",
  vehicleId,
  companyId,
  status: "SCHEDULED",
  completedDate: null,
  estReturnDate: null,
  async save() {},
  toObject() {
    return { ...this };
  },
  ...overrides,
});

const populatedEventQuery = (event) => ({
  populate() {
    return this;
  },
  then(resolve, reject) {
    return Promise.resolve({
      ...event,
      toObject: () => ({ ...event }),
    }).then(resolve, reject);
  },
});

test("creating maintenance inherits the vehicle company and removes available vehicles", async (t) => {
  const vehicle = makeVehicle();
  const event = makeEvent();
  let createPayload;
  t.mock.method(Vehicle, "findById", async () => vehicle);
  t.mock.method(Booking, "find", async () => []);
  t.mock.method(MaintenanceEvent, "create", async (payload) => {
    createPayload = payload;
    return event;
  });
  t.mock.method(MaintenanceEvent, "findById", () => populatedEventQuery(event));

  const result = await maintenanceService.createMaintenanceEvent({
    vehicleId,
    companyId: "ffffffffffffffffffffffff",
    category: "ROUTINE_SERVICE",
    status: "SCHEDULED",
    triggerReason: "Service interval reached",
    estCost: 100,
  }, "dddddddddddddddddddddddd");

  assert.equal(createPayload.companyId, companyId);
  assert.equal(createPayload.createdBy, "dddddddddddddddddddddddd");
  assert.equal(vehicle.operationalStatus, "MAINTENANCE");
  assert.equal(result.dispatchStatus, "SCHEDULED");
});

test("creating maintenance for a nonexistent vehicle returns not found", async (t) => {
  t.mock.method(Vehicle, "findById", async () => null);

  await assert.rejects(
    maintenanceService.createMaintenanceEvent({ vehicleId }, "admin-id"),
    (error) => error instanceof AppError && error.statusCode === 404,
  );
});

test("completing a maintenance event marks it complete and restores vehicle availability", async (t) => {
  const event = makeEvent({ status: "IN_PROGRESS" });
  const vehicle = makeVehicle({ operationalStatus: "MAINTENANCE" });
  let findByIdCalls = 0;
  t.mock.method(MaintenanceEvent, "findById", () =>
    findByIdCalls++ === 0 ? event : populatedEventQuery(event),
  );
  t.mock.method(Vehicle, "findById", async () => vehicle);
  t.mock.method(MaintenanceEvent, "exists", async () => null);

  const result = await maintenanceService.completeMaintenanceEvent(event.id);

  assert.equal(event.status, "COMPLETED");
  assert.ok(event.completedDate instanceof Date);
  assert.equal(vehicle.operationalStatus, "AVAILABLE");
  assert.equal(result.dispatchStatus, "COMPLETED");
});

test("maintenance schema rejects unsupported statuses and negative costs", async () => {
  const event = new MaintenanceEvent({
    vehicleId,
    companyId,
    category: "ROUTINE_SERVICE",
    status: "CANCELLED",
    triggerReason: "Service interval reached",
    estCost: -1,
  });

  let error;
  try {
    await event.validate();
  } catch (validationError) {
    error = validationError;
  }

  assert.ok(error);
  assert.ok(error.errors.status);
  assert.ok(error.errors.estCost);
});
