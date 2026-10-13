import express from "express";
import { googleLogin } from "../controllers/authController.js";
import { validate } from "../middlewares/validate.middleware.js";
import { googleLoginSchema } from "../validations/auth.validation.js";

const router = express.Router();

router.post("/google", validate(googleLoginSchema), googleLogin);

export default router;
