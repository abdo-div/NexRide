import express from "express";
import { protect, restrictTo } from "../middlewares/authMiddleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { create, list, remove, update } from "../controllers/savedSearchController.js";
import { createSavedSearchSchema, savedSearchIdSchema, updateSavedSearchSchema } from "../validations/savedSearch.validation.js";

const router = express.Router();
router.use(protect, restrictTo("customer"));
router.route("/").get(list).post(validate(createSavedSearchSchema), create);
router.route("/:id").patch(validate(updateSavedSearchSchema), update).delete(validate(savedSearchIdSchema), remove);
export default router;
