import pinoHttp from "pino-http";
import { v4 as uuidv4 } from "uuid";
import { logger } from "../utils/logger.js";

export const httpLogger = pinoHttp({
  logger,
  genReqId: (req) => req.headers["x-request-id"] || uuidv4(),
  customSuccessMessage: (req, res) =>
    `${req.method} ${req.url} completed with ${res.statusCode}`,
  customErrorMessage: (req, res, err) =>
    `${req.method} ${req.url} failed with ${res.statusCode}: ${err.message}`,
});
