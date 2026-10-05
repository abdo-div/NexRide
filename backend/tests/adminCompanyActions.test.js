import assert from "node:assert/strict";
import { test } from "node:test";
import Company from "../models/Company_model.js";
import { updateCompanyStatusSchema } from "../validations/company.validation.js";
import * as companyService from "../services/companyService.js";

test("admin company listing includes records marked inactive", async (t) => {
  const companies = [{ _id: "company-1", status: "APPROVED", active: false }];
  const filters = [];
  let initialQueryArgs;
  const query = {
    find(filter) {
      filters.push(filter);
      return this;
    },
    sort() {
      return this;
    },
    select() {
      return this;
    },
    skip() {
      return this;
    },
    limit() {
      return this;
    },
    then(resolve, reject) {
      return Promise.resolve(companies).then(resolve, reject);
    },
  };
  t.mock.method(Company, "find", (...args) => {
    initialQueryArgs = args;
    return query;
  });

  const result = await companyService.fetchAllAdminCompanies({});

  assert.deepEqual(result, companies);
  assert.deepEqual(initialQueryArgs, []);
  assert.deepEqual(filters, [{}]);
});

test("public company listing follows approval status instead of legacy active flag", async (t) => {
  const companies = [{ _id: "company-1", status: "APPROVED", active: false }];
  const query = {
    find() {
      return this;
    },
    sort() {
      return this;
    },
    select() {
      return this;
    },
    skip() {
      return this;
    },
    limit() {
      return this;
    },
    then(resolve, reject) {
      return Promise.resolve(companies).then(resolve, reject);
    },
  };
  let initialQueryArgs;
  t.mock.method(Company, "find", (...args) => {
    initialQueryArgs = args;
    return query;
  });

  const result = await companyService.fetchAllCompanies({});

  assert.deepEqual(result, companies);
  assert.deepEqual(initialQueryArgs, [
    { status: "APPROVED", deletedAt: null },
  ]);
});

test("company status updates persist the requested admin transition", async (t) => {
  const company = {
    status: "PENDING",
    saved: false,
    async save() {
      this.saved = true;
    },
  };
  t.mock.method(Company, "findById", async () => company);

  const updated = await companyService.updateCompanyStatus(
    "aaaaaaaaaaaaaaaaaaaaaaaa",
    "APPROVED",
  );

  assert.equal(updated.status, "APPROVED");
  assert.equal(updated.saved, true);
});

test("company status endpoint validation rejects invalid IDs and unsupported states", () => {
  assert.equal(
    updateCompanyStatusSchema.safeParse({
      params: { id: "not-an-object-id" },
      body: { status: "APPROVED" },
    }).success,
    false,
  );
  assert.equal(
    updateCompanyStatusSchema.safeParse({
      params: { id: "aaaaaaaaaaaaaaaaaaaaaaaa" },
      body: { status: "DELETED" },
    }).success,
    false,
  );
});
