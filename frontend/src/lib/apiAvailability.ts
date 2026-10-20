export const API_UNAVAILABLE_EVENT = "nexride:api-unavailable";
export const API_AVAILABLE_EVENT = "nexride:api-available";

let unavailable = false;

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
  try {
    const response = await fetch(input, init);
    reportApiAvailable();
    return response;
  } catch (error) {
    if (!(error instanceof DOMException && error.name === "AbortError")) {
      reportApiUnavailable();
    }
    throw error;
  }
}
