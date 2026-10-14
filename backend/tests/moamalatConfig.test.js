import assert from "node:assert/strict";
import { test } from "node:test";
import { moamalatConfig, isMoamalatConfigured } from "../config/moamalat.js";
test("gateway config trims deployment values and rejects malformed hex keys", (t) => {
  const keys = ["MOAMALAT_MID", "MOAMALAT_TID", "MOAMALAT_SECURE_KEY"];
  const old = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  t.after(() => { for (const key of keys) { if(old[key] === undefined) delete process.env[key]; else process.env[key] = old[key]; } });
  process.env.MOAMALAT_MID = " merchant "; process.env.MOAMALAT_TID = " terminal "; process.env.MOAMALAT_SECURE_KEY = " abcd ";
  assert.equal(isMoamalatConfigured(), true); assert.equal(moamalatConfig.merchantId, "merchant");
  assert.equal(moamalatConfig.secureKey, "abcd");
  for (const value of ["xyz", "abc", "", "  "]) { process.env.MOAMALAT_SECURE_KEY = value; assert.equal(isMoamalatConfigured(), false); }
});
