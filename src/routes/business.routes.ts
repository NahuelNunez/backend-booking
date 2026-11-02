import { Router } from "express";
import * as businessController from "../controllers/business.controller.js";
import { signupRateLimit } from "../middleware/rate-limit.middleware.js";
import { validateBody } from "../middleware/validate.middleware.js";
import { registerBusinessSchema } from "../validators/business.validator.js";

export const businessRouter = Router();

businessRouter.post(
  "/",
  validateBody(registerBusinessSchema),
  signupRateLimit,
  businessController.registerBusiness,
);
