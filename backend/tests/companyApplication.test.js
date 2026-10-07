import assert from "node:assert/strict";
import { test } from "node:test";
import { ZodError } from "zod";
import fs from "fs/promises";
import User from "../models/User_model.js";
import Company from "../models/Company_model.js";
import AppError from "../utils/appError.js";
import {
  applyForCompany,
  generateApplicationRef,
  slugify,
} from "../services/companyApplicationService.js";
import { companyApplicationSchema } from "../validations/companyApplication.validation.js";

process.env.FRONTEND_URL ??= "http://localhost:5173";
process.env.NODE_ENV ??= "test";

const validApplication = () => ({
  applicant: {
    name: "Salem Al-Warfali",
    email: "partner@example.com",
    phoneNumber: "+218 91 382 9910",
    password: "password123",
    passwordConfirm: "password123",
  },
  company: {
    name: "Al-Safwa Elite Rental LLC",
    commercialRegisterNumber: "LY-TRP-2024-88412",
    city: "Tripoli",
    address: "Airport Road Km 4.5, Tripoli",
  },
  fleet: {
    tier: "SELECTED",
    categories: ["SEDAN", "SUV", "LUXURY_EXECUTIVE"],
  },
  hubs: {
    active: ["Tripoli", "Benghazi"],
    depots: [
      {
        name: "Tripoli Central Depot",
        address: "Airport Road Km 4.5, Tripoli",
        hubType: "PRIMARY",
        phone: "+218 92 511 8844",
        hours: "Sat–Thu: 08:00 – 20:00",
      },
    ],
  },
  policy: {
    minDurationDays: 1,
    maxDurationDays: 30,
    minDriverAge: 23,
    cancellationPolicy: "MODERATE",
    depositAmountLYD: 1000,
    additionalDriverAllowed: true,
    inVehicleSmokingAllowed: false,
  },
  payout: {
    bankName: "Libyan Foreign Bank",
    iban: "LY93 0000 0000 0000 0000 8210",
    accountName: "Al-Safwa Elite Rental LLC",
  },
  documents: [],
});

const userDouble = (email = "partner@example.com") => {
  const user = {
    _id: "aaaaaaaaaaaaaaaaaaaaaaaa",
    id: "aaaaaaaaaaaaaaaaaaaaaaaa",
    name: "Salem Al-Warfali",
    email,
    phoneNumber: "+218913829910",
    role: "company",
    company: null,
    async save() {
      return user;
    },
  };
  return user;
};

test("slugify mirrors the Company model name transform (Arabic and symbols dropped)", () => {
  assert.equal(
    slugify("Al-Safwa Elite Car Rental LLC (شركة الصفوة)"),
    "al-safwa-elite-car-rental-llc",
  );
  assert.equal(slugify("  NexRide -- Partner  "), "nexride-partner");
});

test("public application creates a company-role user and a PENDING company", async (t) => {
  let createdUser;
  let createdCompany;

  t.mock.method(User, "findOne", async () => null);
  t.mock.method(User, "find", () => ({ select: () => ({ lean: async () => [] }) }));
  t.mock.method(Company, "exists", async () => null);
  t.mock.method(Company, "findOne", async () => null);
  t.mock.method(User, "create", async (userData) => {
    createdUser = userDouble();
    return createdUser;
  });
  t.mock.method(Company, "create", async (companyData) => {
    createdCompany = { ...companyData, _id: "dddddddddddddddddddddddd" };
    return createdCompany;
  });

  const { user, company } = await applyForCompany({
    data: validApplication(),
  });

  assert.equal(user.role, "company");
  assert.equal(user.company, company._id);
  assert.equal(createdCompany.status, "PENDING");
  assert.equal(createdCompany.name, "Al-Safwa Elite Rental LLC");
  assert.match(createdCompany.applicationRef, /^NX-APP-\d{4,}$/);
  assert.equal(createdCompany.fleetSizeTier, "SELECTED");
  assert.deepEqual(createdCompany.vehicleCategories, ["SEDAN", "SUV", "LUXURY_EXECUTIVE"]);
  assert.deepEqual(createdCompany.operatingHubs, ["Tripoli", "Benghazi"]);
  assert.equal(createdCompany.rentalPolicy.depositAmountLYD, 1000);
  assert.equal(createdCompany.payout.bankName, "Libyan Foreign Bank");
  assert.equal(createdCompany.commercialRegisterNumber, "LY-TRP-2024-88412");
  assert.equal(createdUser.company, company._id);
});

test("application rejects when the email already has an account", async (t) => {
  t.mock.method(User, "findOne", async () => ({ _id: "bbbbbbbbbbbbbbbbbbbbbbbb" }));

  await assert.rejects(
    () => applyForCompany({ data: validApplication() }),
    (error) =>
      error instanceof AppError && error.statusCode === 409,
  );
});

test("application rejects when the company name is already under review", async (t) => {
  t.mock.method(User, "findOne", async () => null);
  t.mock.method(Company, "findOne", async () => ({ _id: "cccccccccccccccccccccccc" }));

  await assert.rejects(
    () => applyForCompany({ data: validApplication() }),
    (error) =>
      error instanceof AppError && error.statusCode === 409,
  );
});

test("application persists uploaded document metadata when files are provided", async (t) => {
  t.mock.method(User, "findOne", async () => null);
  t.mock.method(User, "find", () => ({ select: () => ({ lean: async () => [] }) }));
  t.mock.method(Company, "exists", async () => null);
  t.mock.method(Company, "findOne", async () => null);
  t.mock.method(User, "create", async () => userDouble());
  t.mock.method(Company, "create", async (companyData) => ({
    ...companyData,
    _id: "eeeeeeeeeeeeeeeeeeeeeeee",
    async save() {
      return this;
    },
  }));
  t.mock.method(fs, "mkdir", async () => undefined);
  t.mock.method(fs, "writeFile", async () => undefined);

  const data = validApplication();
  data.documents = [
    { name: "alsafwa_cr_cert.pdf", kind: "COMMERCIAL_REGISTRY" },
    { name: "salem_id_passport.pdf", kind: "OWNER_ID" },
  ];

  const { company } = await applyForCompany({
    data,
    files: [
      { originalname: "alsafwa_cr_cert.pdf", mimetype: "application/pdf", size: 2516582, buffer: Buffer.from("pdf") },
      { originalname: "salem_id_passport.pdf", mimetype: "application/pdf", size: 1887436, buffer: Buffer.from("pdf") },
    ],
  });

  assert.equal(company.applicationDocuments.length, 2);
  assert.equal(company.applicationDocuments[0].kind, "COMMERCIAL_REGISTRY");
  assert.match(company.applicationDocuments[0].url, /^\/company-documents\//);
});

test("schema rejects an invalid fleet tier and empty categories", () => {
  const bad = validApplication();
  bad.fleet.tier = "GIGANTIC";
  bad.fleet.categories = [];

  assert.throws(() => companyApplicationSchema.parse(bad), ZodError);
});

test("schema enforces matching passwords", () => {
  const bad = validApplication();
  bad.applicant.passwordConfirm = "different123";

  assert.throws(() => companyApplicationSchema.parse(bad), ZodError);
});

test("application reference generator retries until the ref is free", async (t) => {
  let calls = 0;
  t.mock.method(Company, "exists", async () => {
    calls += 1;
    return calls < 2 ? { _id: "cccccccccccccccccccccccc" } : null;
  });

  const ref = await generateApplicationRef();

  assert.match(ref, /^NX-APP-\d{4,}$/);
  assert.ok(calls >= 2, "generator must probe uniqueness more than once");
});

test("application status controller returns the owner application DTO", async (t) => {
  const companyDoc = {
    _id: "dddddddddddddddddddddddd",
    applicationRef: "NX-APP-8842",
    status: "PENDING",
    name: "Al-Safwa Elite Rental LLC",
    email: "partner@example.com",
    phone: "+218913829910",
    city: "Tripoli",
    address: "Airport Road Km 4.5, Tripoli",
    commercialRegisterNumber: "LY-TRP-2024-88412",
    fleetSizeTier: "SELECTED",
    vehicleCategories: ["SEDAN", "SUV"],
    operatingHubs: ["Tripoli", "Benghazi"],
    depots: [{ name: "Tripoli Central Depot" }],
    rentalPolicy: { depositAmountLYD: 1000 },
    payout: { bankName: "Libyan Foreign Bank", iban: "LY93 0000 0000 0000 0000 8210" },
    applicationDocuments: [
      { name: "cr_cert.pdf", kind: "COMMERCIAL_REGISTRY", size: 2516582, url: "/company-documents/d/cr_cert.pdf" },
    ],
    rejectionReason: null,
    createdAt: new Date("2026-10-06T09:30:00.000Z"),
    approvedAt: null,
  };
  t.mock.method(Company, "findById", () => ({
    select: () => companyDoc,
  }));

  const { getMyApplicationStatus } = await import(
    "../controllers/companyApplicationController.js"
  );
  const res = {
    statusCode: undefined,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
    },
  };
  const req = { user: { company: "dddddddddddddddddddddddd" } };

  let nextError;
  await getMyApplicationStatus(req, res, (error) => {
    nextError = error;
  });
  await new Promise((resolve) => setImmediate(resolve));
  if (nextError) throw nextError;

  assert.equal(res.statusCode, 200);
  const { company } = res.body.data;
  assert.equal(company.applicationRef, "NX-APP-8842");
  assert.equal(company.status, "PENDING");
  assert.equal(company.commercialRegisterNumber, "LY-TRP-2024-88412");
  assert.equal(company.applicationDocuments[0].url, "/company-documents/d/cr_cert.pdf");
  assert.equal(company.rejectionReason, null);
});