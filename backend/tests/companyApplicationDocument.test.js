import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs/promises";
import path from "node:path";
import Company from "../models/Company_model.js";
import companyRouter from "../routes/companyRoutes.js";
import {
  downloadApplicationDocument,
} from "../controllers/companyApplicationController.js";
import {
  protectAllowPendingCompany,
} from "../middlewares/authMiddleware.js";
import {
  applicationDocumentParamsSchema,
} from "../validations/company.validation.js";
import { companyDocumentsDirectory } from "../config/privateStorage.js";

process.env.FRONTEND_URL ??= "http://localhost:5173";
process.env.NODE_ENV ??= "test";

const companyA = "aaaaaaaaaaaaaaaaaaaaaaaa";
const companyB = "bbbbbbbbbbbbbbbbbbbbbbbb";
const storedName = "1791375720668-406137689-registry.pdf";

const invoke = async (req) => {
  const state = { statusCode: 200, headers: null, body: null, error: null };
  const res = {
    set(headers) {
      state.headers = headers;
      return res;
    },
    status(statusCode) {
      state.statusCode = statusCode;
      return res;
    },
    send(body) {
      state.body = body;
      return res;
    },
  };

  downloadApplicationDocument(req, res, (error) => {
    state.error = error;
  });
  await new Promise((resolve) => setImmediate(resolve));
  return state;
};

const companyDocument = (companyId = companyA) => ({
  applicationDocuments: [
    {
      name: "registry.pdf",
      mimeType: "application/pdf",
      url: `/api/v1/companies/application-documents/${companyId}/${storedName}`,
    },
  ],
});

test("private document route authenticates, restricts roles, validates, then serves", () => {
  const layer = companyRouter.stack.find(
    (candidate) =>
      candidate.route?.path ===
        "/application-documents/:companyId/:storedName" &&
      candidate.route.methods?.get,
  );

  assert.ok(layer);
  const handlers = layer.route.stack.map((entry) => entry.handle);
  assert.equal(handlers[0], protectAllowPendingCompany);
  assert.equal(handlers.at(-1), downloadApplicationDocument);
  assert.equal(handlers.length, 4);
});

test("the owning company can read its private application document", async (t) => {
  let readPath;
  t.mock.method(Company, "findById", (id) => {
    assert.equal(String(id), companyA);
    return { select: async () => companyDocument() };
  });
  t.mock.method(fs, "readFile", async (filePath) => {
    readPath = path.resolve(filePath);
    return Buffer.from("private-pdf");
  });

  const result = await invoke({
    params: { companyId: companyA, storedName },
    user: { role: "company" },
    tenantId: companyA,
  });

  assert.equal(result.error, null);
  assert.equal(result.statusCode, 200);
  assert.deepEqual(result.body, Buffer.from("private-pdf"));
  assert.equal(result.headers["Content-Type"], "application/pdf");
  assert.equal(result.headers["Cache-Control"], "private, no-store, max-age=0");
  assert.equal(
    readPath,
    path.resolve(companyDocumentsDirectory, companyA, storedName),
  );
});

test("a company is denied before lookup when requesting another tenant document", async (t) => {
  t.mock.method(Company, "findById", () => {
    throw new Error("database lookup must not run for a foreign tenant");
  });

  const result = await invoke({
    params: { companyId: companyB, storedName },
    user: { role: "company" },
    tenantId: companyA,
  });

  assert.equal(result.error?.statusCode, 403);
});

test("an admin can read a registered company document", async (t) => {
  t.mock.method(Company, "findById", () => ({
    select: async () => companyDocument(companyB),
  }));
  t.mock.method(fs, "readFile", async () => Buffer.from("admin-copy"));

  const result = await invoke({
    params: { companyId: companyB, storedName },
    user: { role: "admin" },
    tenantId: null,
  });

  assert.equal(result.error, null);
  assert.equal(result.statusCode, 200);
});

test("a filename must be registered in company metadata before disk access", async (t) => {
  t.mock.method(Company, "findById", () => ({
    select: async () => ({ applicationDocuments: [] }),
  }));
  t.mock.method(fs, "readFile", async () => {
    throw new Error("disk access must not run for unknown metadata");
  });

  const result = await invoke({
    params: { companyId: companyA, storedName },
    user: { role: "company" },
    tenantId: companyA,
  });

  assert.equal(result.error?.statusCode, 404);
});

test("application document validation rejects traversal and malformed names", () => {
  assert.equal(
    applicationDocumentParamsSchema.safeParse({
      params: { companyId: companyA, storedName },
    }).success,
    true,
  );

  for (const candidate of [
    "../secret.pdf",
    "..%2Fsecret.pdf",
    "registry.pdf",
    "1791375720668-1-../secret.pdf",
  ]) {
    assert.equal(
      applicationDocumentParamsSchema.safeParse({
        params: { companyId: companyA, storedName: candidate },
      }).success,
      false,
      candidate,
    );
  }
});
