import express from "express";
import {
  getGatewayConfig,
  createPayment,
  initiatePayment,
  verifyPayment,
} from "../controllers/moamalatController.js";

const router = express.Router();

// Public: hands the browser the LightBox script URL. No secrets exposed.
router.get("/config", getGatewayConfig);

// Payment creation & initialization routes
router.post("/create", createPayment);
router.post("/init", initiatePayment);

// Verification route
router.post("/verify", verifyPayment);

export default router;