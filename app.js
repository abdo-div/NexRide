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
import vehicleRouter from "./routes/vehicleRoutes.js";
import viewRouter from "./routes/viewRoutes.js";

// ============================================
// SECURITY
// ============================================

import {
  securityHeaders,
  securityCors,
  sanitizeNoSQL,
} from "./middlewares/security.middleware.js";

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

import { idempotency } from "./middlewares/idempotency.middleware.js";

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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ============================================
// 1. STRUCTURED HTTP LOGGING
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

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
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

app.use("/api/v1/payments", idempotency(86400));

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
app.use("/api/v1/payments", paymentRouter);
app.use("/api/v1/vehicles", vehicleRouter);

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
