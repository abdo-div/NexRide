import assert from "node:assert/strict";
import { test } from "node:test";
import User from "../models/User_model.js";
import Company from "../models/Company_model.js";
import {
  applyForCompany,
  notifyAdminsOfCompanyApplication,
} from "../services/companyApplicationService.js";
import { renderPartnerApplicationNotice } from "../queues/emailWorker.js";

process.env.FRONTEND_URL ??= "http://localhost:5173";
process.env.NODE_ENV ??= "test";

const adminQueryMock = (emails) =>
  () => ({
    select: () => ({
      lean: async () => emails.map((email) => ({ email })),
    }),
  });

const application = {
  applicationRef: "NX-APP-8842",
  companyName: "Al-Safwa Elite Rental LLC",
  city: "Tripoli",
  subdomain: "al-safwa-elite",
  applicantName: "Salem Al-Warfali",
  applicantEmail: "partner@example.com",
  applicantPhone: "+218913829910",
  fleetTier: "SELECTED",
  fleetCategories: ["SEDAN", "SUV"],
  hubs: ["Tripoli", "Benghazi"],
  depotsCount: 1,
  docsCount: 2,
  payoutBank: "Libyan Foreign Bank",
};

test("new application notifies every platform admin with a matching job", async (t) => {
  t.mock.method(User, "find", adminQueryMock(["admin.a@nexride.com", "admin.b@nexride.com"]));

  const sent = [];
  await notifyAdminsOfCompanyApplication(
    application,
    async (type, payload) => {
      sent.push({ type, payload });
    },
  );

  assert.equal(sent.length, 2);
  assert.ok(sent.every(({ type }) => type === "PARTNER_APPLICATION_RECEIVED"));
  assert.deepEqual(
    sent.map(({ payload }) => payload.to),
    ["admin.a@nexride.com", "admin.b@nexride.com"],
  );
  assert.equal(sent[0].payload.applicationRef, "NX-APP-8842");
  assert.equal(sent[0].payload.companyName, "Al-Safwa Elite Rental LLC");
  assert.equal(sent[0].payload.city, "Tripoli");
});

test("application with no admins enqueues nothing", async (t) => {
  t.mock.method(User, "find", adminQueryMock([]));

  const sent = [];
  await notifyAdminsOfCompanyApplication(
    application,
    async (type, payload) => {
      sent.push({ type, payload });
    },
  );

  assert.deepEqual(sent, []);
});

test("notification failure propagates so the caller can swallow it", async (t) => {
  t.mock.method(User, "find", adminQueryMock(["admin.a@nexride.com"]));

  await assert.rejects(
    notifyAdminsOfCompanyApplication(
      application,
      async () => {
        throw new Error("smtp down");
      },
    ),
    /smtp down/,
  );
});

test("renderPartnerApplicationNotice includes the application summary and review link", () => {
  const { subject, html } = renderPartnerApplicationNotice(application);

  assert.equal(subject, "New Partner Application NX-APP-8842 — Al-Safwa Elite Rental LLC");
  assert.match(html, /NX-APP-8842/);
  assert.match(html, /Al-Safwa Elite Rental LLC/);
  assert.match(html, /partner@example.com/);
  assert.match(html, /\+\d+/);
  assert.match(html, /http:\/\/localhost:5173\/admin\/companies/);
  assert.match(html, /Tripoli/);
});

test("renderPartnerApplicationNotice drops falsy rows and keeps the ref", () => {
  const { html } = renderPartnerApplicationNotice({
    applicationRef: "NX-APP-0001",
    companyName: "Mini Fleet Co",
    applicantEmail: "mini@example.com",
  });

  assert.match(html, /NX-APP-0001/);
  assert.match(html, /Mini Fleet Co/);
  assert.doesNotMatch(html, /docsCount/);
  assert.doesNotMatch(html, /undefined/);
});

test("applyForCompany still succeeds when the admin recipient query returns no admins", async (t) => {
  t.mock.method(User, "findOne", async () => null);
  t.mock.method(User, "find", adminQueryMock([]));
  t.mock.method(Company, "exists", async () => null);
  t.mock.method(Company, "findOne", async () => null);
  t.mock.method(User, "create", async (userData) => ({
    _id: "aaaaaaaaaaaaaaaaaaaaaaaa",
    id: "aaaaaaaaaaaaaaaaaaaaaaaa",
    name: userData.name,
    email: userData.email,
    phoneNumber: userData.phoneNumber,
    role: "company",
    company: null,
    async save() {
      return this;
    },
  }));
  t.mock.method(Company, "create", async (companyData) => ({
    ...companyData,
    _id: "dddddddddddddddddddddddd",
  }));

  const { user, company } = await applyForCompany({
    data: {
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
        categories: ["SEDAN"],
      },
      hubs: {
        active: ["Tripoli"],
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
    },
  });

  assert.equal(user.role, "company");
  assert.equal(company.status, "PENDING");
});