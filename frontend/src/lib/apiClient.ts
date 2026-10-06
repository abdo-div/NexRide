import { getToken } from "./tokenStorage";

export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000/api/v1"
).replace(/\/+$/, "");

export interface ApiFieldError {
  field: string;
  message: string;
}

/**
 * Normalised failure for every non-2xx API response so callers never have to
 * inspect the raw payload. The backend answers with either
 * `{ status, message, errors? }` (validation) or `{ status, message }`
 * (operational AppError).
 */
export class ApiError extends Error {
  readonly status: number;
  readonly fieldErrors: ApiFieldError[];

  constructor(message: string, status: number, fieldErrors: ApiFieldError[] = []) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }

  /** Server-side validation message for a form field, when one was returned. */
  fieldError(field: string): string | undefined {
    return this.fieldErrors.find((error) => error.field === field)?.message;
  }
}

export const isUnauthorized = (error: unknown): boolean =>
  error instanceof ApiError && error.status === 401;

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  /** Set to false for the sign-in/sign-up calls, which must not send a stale token. */
  auth?: boolean;
  signal?: AbortSignal;
  /** Extra headers merged over the defaults (e.g. Idempotency-Key). */
  headers?: Record<string, string>;
}

const parsePayload = async (response: Response): Promise<Record<string, unknown>> => {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return {};
  try {
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
};

export async function request<T>(
  path: string,
  { method = "GET", body, auth = true, signal, headers: extraHeaders }: RequestOptions = {},
): Promise<T> {
  const isFormData =
    typeof FormData !== "undefined" && body instanceof FormData;
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...extraHeaders,
  };
  if (body !== undefined && !isFormData) headers["Content-Type"] = "application/json";

  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
      credentials: "include",
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError(
      "Unable to reach the NexRide API. Check that the backend is running.",
      0,
    );
  }

  const payload = await parsePayload(response);

  if (!response.ok) {
    const message =
      typeof payload.message === "string" && payload.message
        ? payload.message
        : `Request failed with status ${response.status}`;
    const fieldErrors = Array.isArray(payload.errors)
      ? (payload.errors as ApiFieldError[])
      : [];
    throw new ApiError(message, response.status, fieldErrors);
  }

  return payload as T;
}
