import assert from "node:assert/strict";
import { test } from "node:test";
import Company from "../models/Company_model.js";
import { updateCompanyStatusSchema } from "../validations/company.validation.js";
import * as companyService from "../services/companyService.js";

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
