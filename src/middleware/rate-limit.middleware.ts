import { rateLimit } from "express-rate-limit";
import { AppError } from "../utils/AppError.js";

const SIGNUP_WINDOW_MS = 15 * 60 * 1000;
const SIGNUP_MAX_ATTEMPTS = 10;

// Mounted after validation: only valid requests reach the expensive password
// hash, and a user correcting form errors shouldn't use up their attempts.
export const signupRateLimit = rateLimit({
  windowMs: SIGNUP_WINDOW_MS,
  limit: SIGNUP_MAX_ATTEMPTS,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: (_req, _res, next) => {
    next(new AppError(429, "RATE_LIMITED", "Too many attempts, please try again later"));
  },
});
