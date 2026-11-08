import { MpgsError } from "./mpgs.errors.js";

const DEFAULT_TIMEOUT_MS = 15_000;

const encodeSegment = (value) => encodeURIComponent(String(value));

const parseResponseBody = async (response) => {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch (cause) {
    throw new MpgsError("MPGS returned an invalid JSON response", {
      cause,
      httpStatus: response.status,
      gatewayCode: "INVALID_RESPONSE",
      retryable: response.status >= 500,
    });
  }
};

const gatewayCodeFrom = (body) =>
  body?.error?.cause ?? body?.response?.gatewayCode ?? body?.result ?? null;

const gatewayMessageFrom = (body) =>
  body?.error?.explanation ??
  body?.error?.validationType ??
  "MPGS rejected the request";

const isSafeApiPath = (path) => {
  if (!/^\/(?:[A-Za-z0-9._~!$&'()*+,;=:@%-]+\/?)*$/.test(path)) {
    return false;
  }

  try {
    return path
      .split("/")
      .every((segment) => ![".", ".."].includes(decodeURIComponent(segment)));
  } catch {
    return false;
  }
};

/**
 * Low-level, application-independent client for the MPGS REST API.
 *
 * `fetchImpl` is injectable so consuming applications can test every gateway
 * interaction without network access or real merchant credentials.
 */
export class MpgsClient {
  constructor({
    config,
    fetchImpl = globalThis.fetch,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  }) {
    if (!config) throw new TypeError("MPGS config is required");
    if (typeof fetchImpl !== "function") {
      throw new TypeError("A fetch implementation is required");
    }
    if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) {
      throw new TypeError("MPGS timeout must be a positive integer");
    }

    this.config = config;
    this.fetchImpl = fetchImpl;
    this.timeoutMs = timeoutMs;
    this.apiRoot =
      `${config.baseUrl}/api/rest/version/${encodeSegment(config.apiVersion)}` +
      `/merchant/${encodeSegment(config.merchantId)}`;
  }

  async request({ method = "GET", path = "", body, signal } = {}) {
    if (!isSafeApiPath(path)) {
      throw new TypeError("MPGS request path must be an absolute API path");
    }

    const timeoutController = new AbortController();
    const timeout = setTimeout(
      () => timeoutController.abort(new Error("MPGS request timed out")),
      this.timeoutMs,
    );

    const requestSignal = signal
      ? AbortSignal.any([signal, timeoutController.signal])
      : timeoutController.signal;

    const username = `merchant.${this.config.merchantId}`;
    const authorization = Buffer.from(
      `${username}:${this.config.apiPassword}`,
      "utf8",
    ).toString("base64");

    const headers = {
      Accept: "application/json",
      Authorization: `Basic ${authorization}`,
    };
    if (body !== undefined) headers["Content-Type"] = "application/json";

    let response;
    try {
      response = await this.fetchImpl(`${this.apiRoot}${path}`, {
        method: String(method).toUpperCase(),
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: requestSignal,
      });
    } catch (cause) {
      const timedOut = timeoutController.signal.aborted && !signal?.aborted;
      throw new MpgsError(
        timedOut ? "MPGS request timed out" : "Could not reach MPGS",
        {
          cause,
          gatewayCode: timedOut ? "TIMEOUT" : "NETWORK_ERROR",
          retryable: true,
        },
      );
    } finally {
      clearTimeout(timeout);
    }

    const responseBody = await parseResponseBody(response);
    if (!response.ok) {
      throw new MpgsError(gatewayMessageFrom(responseBody), {
        httpStatus: response.status,
        gatewayCode: gatewayCodeFrom(responseBody),
        retryable: response.status === 429 || response.status >= 500,
      });
    }

    return responseBody;
  }
}
