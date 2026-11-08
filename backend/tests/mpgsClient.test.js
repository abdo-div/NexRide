import test from "node:test";
import assert from "node:assert/strict";
import { MpgsClient } from "../payments/providers/mpgs/mpgs.client.js";
import { MpgsError } from "../payments/providers/mpgs/mpgs.errors.js";

const config = Object.freeze({
  baseUrl: "https://example.gateway.mastercard.com",
  merchantId: "TEST MERCHANT/1",
  apiPassword: "test-password",
  apiVersion: "100",
  currency: "LYD",
});

const jsonResponse = (body, { status = 200 } = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  text: async () => (body === null ? "" : JSON.stringify(body)),
});

test("builds the versioned merchant URL and Basic authentication", async () => {
  let observed;
  const fetchImpl = async (url, options) => {
    observed = { url, options };
    return jsonResponse({ result: "SUCCESS" });
  };
  const client = new MpgsClient({ config, fetchImpl });

  const result = await client.request({
    method: "PUT",
    path: "/session",
    body: { apiOperation: "CREATE_CHECKOUT_SESSION" },
  });

  assert.equal(
    observed.url,
    "https://example.gateway.mastercard.com/api/rest/version/100/merchant/TEST%20MERCHANT%2F1/session",
  );
  assert.equal(observed.options.method, "PUT");
  assert.equal(observed.options.headers.Accept, "application/json");
  assert.equal(observed.options.headers["Content-Type"], "application/json");
  assert.deepEqual(JSON.parse(observed.options.body), {
    apiOperation: "CREATE_CHECKOUT_SESSION",
  });

  const encodedCredentials = observed.options.headers.Authorization.replace(
    "Basic ",
    "",
  );
  assert.equal(
    Buffer.from(encodedCredentials, "base64").toString("utf8"),
    "merchant.TEST MERCHANT/1:test-password",
  );
  assert.deepEqual(result, { result: "SUCCESS" });
});

test("omits a request body and content type for GET requests", async () => {
  let observedOptions;
  const client = new MpgsClient({
    config,
    fetchImpl: async (_url, options) => {
      observedOptions = options;
      return jsonResponse({ id: "ORDER-1" });
    },
  });

  await client.request({ path: "/order/ORDER-1" });

  assert.equal(observedOptions.method, "GET");
  assert.equal(observedOptions.body, undefined);
  assert.equal(observedOptions.headers["Content-Type"], undefined);
});

test("returns null for a successful empty response", async () => {
  const client = new MpgsClient({
    config,
    fetchImpl: async () => jsonResponse(null, { status: 204 }),
  });

  assert.equal(await client.request({ path: "/probe" }), null);
});

test("normalizes MPGS error responses without exposing credentials", async () => {
  const client = new MpgsClient({
    config,
    fetchImpl: async () =>
      jsonResponse(
        {
          error: {
            cause: "INVALID_REQUEST",
            explanation: "The order amount is invalid",
          },
        },
        { status: 400 },
      ),
  });

  await assert.rejects(
    () => client.request({ method: "POST", path: "/session", body: {} }),
    (error) => {
      assert.ok(error instanceof MpgsError);
      assert.equal(error.message, "The order amount is invalid");
      assert.equal(error.httpStatus, 400);
      assert.equal(error.gatewayCode, "INVALID_REQUEST");
      assert.equal(error.retryable, false);
      assert.doesNotMatch(error.message, /test-password/);
      return true;
    },
  );
});

test("marks throttling and server errors as retryable", async () => {
  for (const status of [429, 500, 503]) {
    const client = new MpgsClient({
      config,
      fetchImpl: async () =>
        jsonResponse({ error: { cause: "SYSTEM_ERROR" } }, { status }),
    });

    await assert.rejects(
      () => client.request({ path: "/probe" }),
      (error) => error instanceof MpgsError && error.retryable === true,
    );
  }
});

test("rejects malformed JSON returned by the gateway", async () => {
  const client = new MpgsClient({
    config,
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      text: async () => "<html>not json</html>",
    }),
  });

  await assert.rejects(
    () => client.request({ path: "/probe" }),
    (error) =>
      error instanceof MpgsError &&
      error.gatewayCode === "INVALID_RESPONSE" &&
      error.httpStatus === 200,
  );
});

test("normalizes network failures as retryable", async () => {
  const cause = new Error("connection reset");
  const client = new MpgsClient({
    config,
    fetchImpl: async () => {
      throw cause;
    },
  });

  await assert.rejects(
    () => client.request({ path: "/probe" }),
    (error) => {
      assert.ok(error instanceof MpgsError);
      assert.equal(error.gatewayCode, "NETWORK_ERROR");
      assert.equal(error.retryable, true);
      assert.equal(error.cause, cause);
      return true;
    },
  );
});

test("aborts slow requests at the configured timeout", async () => {
  const fetchImpl = (_url, { signal }) =>
    new Promise((_resolve, reject) => {
      signal.addEventListener("abort", () => reject(signal.reason), {
        once: true,
      });
    });
  const client = new MpgsClient({ config, fetchImpl, timeoutMs: 5 });

  await assert.rejects(
    () => client.request({ path: "/slow" }),
    (error) =>
      error instanceof MpgsError &&
      error.gatewayCode === "TIMEOUT" &&
      error.retryable === true,
  );
});

test("rejects paths that could escape the merchant API root", async () => {
  const client = new MpgsClient({
    config,
    fetchImpl: async () => jsonResponse({}),
  });

  await assert.rejects(
    () => client.request({ path: "https://attacker.example" }),
    /absolute API path/,
  );
  await assert.rejects(
    () => client.request({ path: "/../other-merchant" }),
    /absolute API path/,
  );
  await assert.rejects(
    () => client.request({ path: "/%2e%2e/other-merchant" }),
    /absolute API path/,
  );
  await assert.rejects(
    () => client.request({ path: "/order?id=1" }),
    /absolute API path/,
  );
});

test("validates required constructor dependencies", () => {
  assert.throws(() => new MpgsClient({}), /config is required/);
  assert.throws(
    () => new MpgsClient({ config, fetchImpl: null }),
    /fetch implementation is required/,
  );
  assert.throws(
    () => new MpgsClient({ config, fetchImpl: async () => {}, timeoutMs: 0 }),
    /timeout must be a positive integer/,
  );
});
