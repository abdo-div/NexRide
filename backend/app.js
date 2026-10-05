import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import swaggerUi from "swagger-ui-express";

// ============================================
// ROUTES
// ============================================

import userRouter from "./routes/userRoutes.js";
import reviewRouter from "./routes/reviewRoutes.js";
import bookingRouter from "./routes/bookingRoutes.js";
import companyRouter from "./routes/companyRoutes.js";
import paymentRouter from "./routes/paymentRoutes.js";
import moamalatRouter from "./routes/moamalatRoutes.js";
import vehicleRouter from "./routes/vehicleRoutes.js";
import viewRouter from "./routes/viewRoutes.js";
import adminRouter from "./routes/admin.routes.js";
import {
  getGatewayConfig,
  createPayment,
  verifyPayment,
} from "./controllers/moamalatController.js";

// ============================================
// SECURITY
// ============================================

import {
  securityHeaders,
  securityCors,
  sanitizeNoSQL,
} from "./middlewares/security.middleware.js";
import { protect, restrictTo } from "./middlewares/authMiddleware.js";
import { validate } from "./middlewares/validate.middleware.js";
import {
  initiatePaymentSchema,
  verifyPaymentSchema,
} from "./validations/moamalat.validation.js";

// ============================================
// RATE LIMITING
// ============================================

import { apiLimiter, authLimiter } from "./middlewares/rateLimitMiddleware.js";

// ============================================
// TENANT
// ============================================

import { resolveTenant } from "./middlewares/tenantMiddleware.js";

// ============================================
// IDEMPOTENCY
// ============================================

import { idempotency } from "./middlewares/idempotence.middleware.js";

// ============================================
// LOGGING
// ============================================

import { httpLogger } from "./middlewares/logger.middleware.js";

// ============================================
// HEALTH CHECKS
// ============================================

import { getLiveness, getReadiness } from "./controllers/health.controller.js";

// ============================================
// SWAGGER
// ============================================

import { swaggerSpec } from "./config/swagger.js";

// ============================================
// ERROR HANDLING
// ============================================

import AppError from "./utils/appError.js";
import globalErrorHandler from "./middlewares/errorMiddleware.js";
import { isDevelopment } from "./config/env.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ============================================
// 1. REVERSE PROXY TRUST
// ============================================

// The app runs behind a single reverse proxy (Nginx / Render / Fly). Trusting
// exactly one hop makes `req.protocol` and `req.ip` reflect X-Forwarded-Proto
// and X-Forwarded-For, so `secure` cookies are issued over TLS and rate
// limiters bucket by real client IP instead of the proxy's.
//
// Trusting `true` would be worse than not setting this at all: any client could
// forge its own forwarded headers and both spoof its IP past the limiters and
// downgrade the protocol cookie. A numeric hop count is the safe middle ground
// because the deployed topology has a fixed depth.
app.set("trust proxy", 1);

// ============================================
// 2. STRUCTURED HTTP LOGGING
// ============================================

app.use(httpLogger);

// ============================================
// 2. HEALTH CHECKS
// ============================================

app.get("/health/liveness", getLiveness);

app.get("/health/readiness", getReadiness);

// ============================================
// 3. VIEW ENGINE
// ============================================

app.set("view engine", "pug");
app.set("views", path.join(__dirname, "views"));

// ============================================
// 4. SECURITY HEADERS & CORS
// ============================================

app.use(securityHeaders);
app.use(securityCors);

// ============================================
// 5. DEVELOPMENT LOGGING
// ============================================

if (isDevelopment()) {
  // Custom format rather than "dev": the built-in dev format omits headers but
  // logs the full URL, which can carry tokens in query parameters (gateway
  // callbacks, password-reset codes). The path only is logged here; the
  // structured logger above carries the same information safely.
  morgan.token("safe-url", (req) => req.originalUrl?.split("?")[0] ?? req.url);
  app.use(morgan(":method :safe-url :status :res[content-type] - :response-time ms"));
}

// ============================================
// 6. STATIC FILES
// ============================================

app.use(express.static(path.join(__dirname, "public")));

// ============================================
// 7. BODY PARSING
// ============================================

app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(cookieParser());

// ============================================
// 8. NOSQL SANITIZATION
// ============================================

app.use(sanitizeNoSQL);

// ============================================
// 9. API RATE LIMITING + TENANT RESOLUTION
// ============================================

app.use("/api/v1", apiLimiter, resolveTenant);

// ============================================
// 10. AUTH RATE LIMITING
// ============================================

app.use(
  [
    "/api/v1/users/signup",
    "/api/v1/users/login",
    "/api/v1/users/forgot-password",
    "/api/v1/users/reset-password",
  ],
  authLimiter,
);

// ============================================
// 11. IDEMPOTENCY
// ============================================

app.use("/api/v1/bookings", idempotency(86400));

// ============================================
// 12. API DOCUMENTATION
// ============================================

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ============================================
// 13. APPLICATION ROUTES
// ============================================

app.use("/", viewRouter);

app.use("/api/v1/cars", vehicleRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/reviews", reviewRouter);
app.use("/api/v1/bookings", bookingRouter);
app.use("/api/v1/companies", companyRouter);
app.use("/api/v1/payments/moamalat", moamalatRouter);
app.use("/api/v1/payments", paymentRouter);
app.use("/api/v1/vehicles", vehicleRouter);

// Moamalat direct integration routes (manager specification)
app.get("/api/config", getGatewayConfig);
app.post(
  "/api/payment/create",
  protect,
  restrictTo("customer"),
  validate(initiatePaymentSchema),
  createPayment,
);
app.post("/api/payment/verify", validate(verifyPaymentSchema), verifyPayment);

app.use("/api/v1/admin", adminRouter);


// ============================================
// 14. 404 - ROUTE NOT FOUND
// ============================================

app.all("/{*path}", (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// ============================================
// 15. GLOBAL ERROR HANDLER
// ============================================

app.use(globalErrorHandler);

export default app;
