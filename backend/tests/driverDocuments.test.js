import assert from "node:assert/strict";
import { test } from "node:test";
import User from "../models/User_model.js";
import userRouter from "../routes/userRoutes.js";
import { serializeDriverVerification } from "../services/driverDocumentService.js";

const route = (path, method) => {
  const layer = userRouter.stack.find((item) => item.route?.path === path && item.route.methods[method]);
  assert.ok(layer, `expected ${method.toUpperCase()} ${path}`);
  return layer.route.stack.map((item) => item.handle);
};

test("driver document metadata defaults to not uploaded and filenames are private", () => {
  const user = new User({ name:"Driver", email:"driver@example.com", phoneNumber:"1", password:"password1", passwordConfirm:"password1" });
  assert.equal(user.driverVerification.status, "NOT_UPLOADED");
  assert.equal(User.schema.path("driverVerification.licence.filename").options.select, false);
  assert.equal(User.schema.path("driverVerification.identity.filename").options.select, false);
});

test("approved documents become expired when either document is out of date", () => {
  const result = serializeDriverVerification({
    status:"APPROVED",
    licence:{filename:"private.pdf",expiresAt:new Date("2020-01-01")},
    identity:{filename:"private-id.pdf",expiresAt:new Date("2099-01-01")},
  });
  assert.equal(result.status, "EXPIRED");
  assert.equal(result.licence.uploaded, true);
  assert.equal(Object.hasOwn(result.licence, "filename"), false);
});

test("customer upload and reviewer endpoints are separately role-gated", async () => {
  const customerHandlers = route("/me/driver-documents", "patch");
  const customerRoleError = await new Promise((resolve) =>
    customerHandlers[0]({user:{role:"company"}}, {}, resolve),
  );
  assert.equal(customerRoleError.statusCode, 403);

  const reviewerHandlers = route("/:id/driver-documents/review", "patch");
  const reviewerRoleError = await new Promise((resolve) =>
    reviewerHandlers[0]({user:{role:"customer"}}, {}, resolve),
  );
  assert.equal(reviewerRoleError.statusCode, 403);
});
