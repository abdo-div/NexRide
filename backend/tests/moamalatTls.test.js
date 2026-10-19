import assert from "node:assert/strict";
import test from "node:test";
import { X509Certificate } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { MOAMALAT_INTERMEDIATE_CA } from "../config/moamalatCa.js";

test("the Render fallback trusts only the published Moamalat certificate chain", () => {
  const certificate = new X509Certificate(MOAMALAT_INTERMEDIATE_CA);
  assert.match(certificate.subject, /CN=RapidSSL TLS RSA CA G1/);
  assert.match(certificate.issuer, /CN=DigiCert Global Root G2/);

  const source = readFileSync(
    fileURLToPath(new URL("../services/moamalat.service.js", import.meta.url)),
    "utf8",
  );
  assert.match(source, /ca: \[\.\.\.tls\.rootCertificates, MOAMALAT_INTERMEDIATE_CA\]/);
  assert.doesNotMatch(source, /rejectUnauthorized:\s*false/);
});
