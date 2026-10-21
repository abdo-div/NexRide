export const API_UNAVAILABLE_EVENT = "nexride:api-unavailable";
export const API_AVAILABLE_EVENT = "nexride:api-available";

let unavailable = false;
const RETRY_DELAY_MS = 200;
const TRANSIENT_STATUS_CODES = new Set([502, 503, 504]);

const waitBeforeRetry = () =>
  new Promise<void>((resolve) => globalThis.setTimeout(resolve, RETRY_DELAY_MS));

export function canRetryRequest(method = "GET") {
  return method.toUpperCase() === "GET" || method.toUpperCase() === "HEAD";
}

export function reportApiUnavailable() {
  if (unavailable) return;
  unavailable = true;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(API_UNAVAILABLE_EVENT));
  }
}

export function reportApiAvailable() {
  if (!unavailable) return;
  unavailable = false;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(API_AVAILABLE_EVENT));
  }
}

export async function trackedFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const retryable = canRetryRequest(init?.method);

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch(input, init);
      const transientFailure = TRANSIENT_STATUS_CODES.has(response.status);
      if (retryable && transientFailure && attempt === 0) {
        await waitBeforeRetry();
        continue;
      }
      if (transientFailure) reportApiUnavailable();
      else reportApiAvailable();
      return response;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") throw error;
      if (retryable && attempt === 0) {
        await waitBeforeRetry();
        continue;
      }
      reportApiUnavailable();
      throw error;
    }
  }

  throw new Error("Unreachable API retry state");
}
