import swaggerJSDoc from "swagger-jsdoc";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Swagger/OpenAPI generation.
 *
 * Route discovery is based on the real backend `routes/` directory (resolved
 * from this file's own location, so it works regardless of the process working
 * directory or where the project is cloned). The server URL mirrors the same
 * PORT the API itself listens on (see server.js) and keeps the `/api/v1`
 * mount prefix used in app.js.
 */
// The underlying glob engine only understands POSIX separators, so a native
// Windows path such as `C:\...\routes\*.js` silently matches nothing. Normalise
// the glob before handing it over.
const routesGlob = path
  .join(__dirname, "..", "routes", "*.js")
  .split(path.sep)
  .join("/");

// server.js already loads the env file before importing the app, so this is only
// a fallback for direct imports (tests, scripts). It never overrides an existing
// PORT, and `quiet` keeps the startup output clean.
if (!process.env.PORT) {
  const envFile = [
    path.join(__dirname, "..", "config.env"),
    path.join(__dirname, "..", ".env"),
    path.join(__dirname, "..", "..", ".env"),
  ].find((candidate) => fs.existsSync(candidate));

  if (envFile) {
    dotenv.config({ path: envFile, quiet: true });
  }
}

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const API_PREFIX = "/api/v1";

export const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: "3.0.0",
    info: {
      title: "NexRide API Specification",
      version: "1.0.0",
      description:
        "Enterprise API documentation for NexRide Car Rental Marketplace & Management Platform",
    },
    servers: [
      {
        url: `http://localhost:${PORT}${API_PREFIX}`,
        description: "Local Development Server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        SignupRequest: {
          type: "object",
          required: ["name", "email", "password"],
          properties: {
            name: { type: "string" },
            email: { type: "string" },
            phoneNumber: { type: "string" },
            password: { type: "string", format: "password" },
            role: {
              type: "string",
              enum: ["customer", "company", "admin"],
            },
          },
        },
        LoginRequest: {
          type: "object",
          required: ["password"],
          properties: {
            email: { type: "string" },
            phoneNumber: { type: "string" },
            password: { type: "string", format: "password" },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: [routesGlob],
});
