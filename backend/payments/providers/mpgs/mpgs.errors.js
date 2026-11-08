/**
 * Stable error type exposed by the MPGS module.
 *
 * Callers do not need to understand every gateway response shape and can make
 * retry decisions without exposing gateway details or credentials to clients.
 */
export class MpgsError extends Error {
  constructor(message, options = {}) {
    super(message, { cause: options.cause });

    this.name = "MpgsError";
    this.httpStatus = options.httpStatus ?? null;
    this.gatewayCode = options.gatewayCode ?? null;
    this.retryable = options.retryable ?? false;
  }
}
