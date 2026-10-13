import express from "express";
import { subscribe } from "../controllers/newsletterController.js";
import { validate } from "../middlewares/validate.middleware.js";
import { subscribeNewsletterSchema } from "../validations/newsletter.validation.js";

const router = express.Router();

router.post("/subscribe", validate(subscribeNewsletterSchema), subscribe);

export default router;
