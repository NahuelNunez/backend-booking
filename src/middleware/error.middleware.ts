import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError.js";

// Unique constraints we expect users to hit, mapped to friendly API errors.
const UNIQUE_VIOLATIONS: Record<string, { code: string; message: string }> = {
  user_account_email_key: { code: "EMAIL_TAKEN", message: "An account with this email already exists" },
  tenant_slug_key: { code: "SLUG_TAKEN", message: "This business URL is already taken" },
};

interface PgError {
  code: string;
  constraint?: string;
}

const isPgError = (error: unknown): error is PgError =>
  typeof error === "object" && error !== null && "code" in error && typeof error.code === "string";

const sendError = (res: Response, status: number, code: string, message: string, details?: unknown) => {
  res.status(status).json({
    success: false,
    error: { message, code, ...(details === undefined ? {} : { details }) },
  });
};

export const notFoundHandler = (_req: Request, res: Response) => {
  sendError(res, 404, "NOT_FOUND", "Route not found");
};

export const errorHandler = (error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof AppError) {
    sendError(res, error.statusCode, error.code, error.message, error.details);
    return;
  }

  if (error instanceof SyntaxError && "body" in error) {
    sendError(res, 400, "INVALID_JSON", "Request body is not valid JSON");
    return;
  }

  if (isPgError(error) && error.code === "23505" && error.constraint) {
    const mapped = UNIQUE_VIOLATIONS[error.constraint];
    if (mapped) {
      sendError(res, 409, mapped.code, mapped.message);
      return;
    }
  }

  console.error(error);
  sendError(res, 500, "INTERNAL_ERROR", "Something went wrong");
};
