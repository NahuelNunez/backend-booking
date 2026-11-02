import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../config/env.js";
import type { AccessTokenPayload } from "../types/auth.types.js";

export const signAccessToken = (payload: AccessTokenPayload): string =>
  jwt.sign(payload, env.JWT_SECRET, {
    // Format is enforced by the env schema (e.g. "7d").
    expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"],
  });
