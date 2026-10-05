import assert from "node:assert/strict";
import { test } from "node:test";
import Company from "../models/Company_model.js";
import { getCompanyById } from "../controllers/companyController.js";
import * as companyService from "../services/companyService.js";

const companyId = "aaaaaaaaaaaaaaaaaaaaaaaa";
const safeFields = ["_id", "name", "slug", "logo", "description", "city"];
const privateCompany = {
  _id: companyId,
  name: "Approved Rentals",
  slug: "approved-rentals",
  logo: "approved-rentals.png",
  description: "Public company description",
  city: "Tripoli",
  ownerId: "bbbbbbbbbbbbbbbbbbbbbbbb",
  status: "APPROVED",
  deletedAt: null,
  email: "private@example.test",
  phone: "+218900000000",
  address: "Private address",
  customCommissionRate: 12,
  commissionAmount: 900,
  approvedAt: new Date("2025-01-01T00:00:00.000Z"),
  createdAt: new Date("2024-01-01T00:00:00.000Z"),
  updatedAt: new Date("2025-01-01T00:00:00.000Z"),
  __v: 3,
};

const mockPublicLookup = (t, company) => {
  const calls = { filter: null, projection: null, lean: false };
  const query = {
    select(projection) {
      calls.projection = projection;
      return this;
    },
    lean() {
      calls.lean = true;
      return this;
    },
    then(resolve, reject) {
      const matchesPublicFilter =
        company &&
        company._id === calls.filter?._id &&
        company.status === calls.filter?.status &&
        company.deletedAt === calls.filter?.deletedAt;
      return Promise.resolve(matchesPublicFilter ? company : null).then(
        resolve,
        reject,
      );
    },
  };
  t.mock.method(Company, "findOne", (filter) => {
    calls.filter = filter;
    return query;
  });
  return calls;
};

test("approved, non-deleted company returns only the public DTO", async (t) => {
  const calls = mockPublicLookup(t, privateCompany);

  const result = await companyService.fetchPublicCompanyById(companyId);

  assert.deepEqual(calls.filter, {
    _id: companyId,
    status: "APPROVED",
    deletedAt: null,
  });
  assert.equal(calls.projection, safeFields.join(" "));
  assert.equal(calls.lean, true);
  assert.deepEqual(Object.keys(result), safeFields);
  assert.deepEqual(result, {
    _id: companyId,
    name: "Approved Rentals",
    slug: "approved-rentals",
    logo: "approved-rentals.png",
    description: "Public company description",
    city: "Tripoli",
  });
});

for (const status of ["SUSPENDED", "PENDING", "REJECTED"]) {
  test(`${status.toLowerCase()} company is not publicly exposed`, async (t) => {
    mockPublicLookup(t, { ...privateCompany, status });

    await assert.rejects(
      companyService.fetchPublicCompanyById(companyId),
      (error) => error.statusCode === 404 && error.message === "No company found with that ID",
    );
  });
}

test("deleted company is not publicly exposed", async (t) => {
  mockPublicLookup(t, {
    ...privateCompany,
    deletedAt: new Date("2025-02-01T00:00:00.000Z"),
  });

  await assert.rejects(
    companyService.fetchPublicCompanyById(companyId),
    (error) => error.statusCode === 404 && error.message === "No company found with that ID",
  );
});

test("missing company returns the generic public not-found response", async (t) => {
  mockPublicLookup(t, null);

  await assert.rejects(
    companyService.fetchPublicCompanyById(companyId),
    (error) => error.statusCode === 404 && error.message === "No company found with that ID",
  );
});

test("public company-by-ID controller responds with only the safe DTO", async (t) => {
  mockPublicLookup(t, privateCompany);
  let responseBody;
  const response = {
    status(statusCode) {
      assert.equal(statusCode, 200);
      return this;
    },
    json(body) {
      responseBody = body;
      return this;
    },
  };

  await new Promise((resolve, reject) => {
    response.json = (body) => {
      responseBody = body;
      resolve();
      return response;
    };
    getCompanyById({ params: { id: companyId } }, response, reject);
  });

  assert.deepEqual(Object.keys(responseBody.data.company), safeFields);
  assert.equal("ownerId" in responseBody.data.company, false);
  assert.equal("status" in responseBody.data.company, false);
  assert.equal("customCommissionRate" in responseBody.data.company, false);
  assert.equal("commissionAmount" in responseBody.data.company, false);
  assert.equal("email" in responseBody.data.company, false);
  assert.equal("phone" in responseBody.data.company, false);
  assert.equal("address" in responseBody.data.company, false);
  assert.equal("approvedAt" in responseBody.data.company, false);
  assert.equal("createdAt" in responseBody.data.company, false);
  assert.equal("updatedAt" in responseBody.data.company, false);
  assert.equal("__v" in responseBody.data.company, false);
});