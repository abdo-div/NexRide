import pinoHttp from "pino-http";
import { v4 as uuidv4 } from "uuid";
import { logger } from "../utils/logger.js";

/**
 * Strip the query string from a request path.
 *
 * pino-http hands the serializer a wrapped request whose `originalUrl` is
 * undefined and whose `url` still carries the query string, so both sources are
 * checked and the query is removed either way. Query strings routinely hold
 * tokens (gateway callback parameters, password-reset codes), and this is the
 * only place they could still leak.
 */
const pathOf = (req) => {
  const source = req.originalUrl ?? req.raw?.originalUrl ?? req.url ?? "";
  return String(source).split("?")[0];
};

/**
 * Request serializer emitting only operational metadata.
 *
 * pino-http's default serializer includes the entire header bag, which is how
 * `Authorization: Bearer <jwt>` and `Cookie: jwt=<jwt>` were reaching log files
 * on every request. The allowlist below is intentionally narrow: it covers
 * debugging needs (which route, which request, how slow) without echoing
 * anything a client controls beyond a coarse user agent.
 */
export const requestSerializer = (req) => ({
  id: req.id,
  method: req.method,
  // Query strings carry tokens (gateway callback params, password-reset codes),
  // so only the path is emitted. Logging the raw `url` here would reintroduce
  // exactly the leak this serializer exists to prevent.
  url: pathOf(req),
  remoteAddress: req.remoteAddress,
  userAgent: req.headers?.["user-agent"],
  // Present but never the value, so session state stays visible without leaking.
  hasAuthorization: Boolean(req.headers?.authorization),
});

export const responseSerializer = (res) => ({
  statusCode: res.statusCode,
  headers: res.headers
    ? { "content-type": res.headers["content-type"] }
    : undefined,
});

export const httpLogger = pinoHttp({
  logger,
  genReqId: (req) => req.headers["x-request-id"] || uuidv4(),
  // Replace the header-dumping serializers rather than relying on redact alone.
  // The serializers are the primary control; redact is the backstop for
  // anything logged through a custom serializer elsewhere in the codebase.
  serializers: {
    req: requestSerializer,
    res: responseSerializer,
  },
  customLogLevel: (req, res, err) => {
    if (err || res.statusCode >= 500) return "error";
    if (res.statusCode >= 400) return "warn";
    return "info";
  },
  // The message strings bypass the serializers, so the query string is trimmed
  // here too rather than relying on the serializer alone.
  customSuccessMessage: (req, res) =>
    `${req.method} ${pathOf(req)} completed with ${res.statusCode}`,
  customErrorMessage: (req, res, err) =>
    `${req.method} ${pathOf(req)} failed with ${res.statusCode}: ${err.message}`,
});
