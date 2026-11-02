import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError.js";

// Unique constraints we expect users to hit, mapped to friendly API errors.
const UNIQUE_VIOLATIONS: Record<string, { code: string; message: string }> = {
  user_account_email_key: { code: "EMAIL_TAKEN", message: "An account with this email already exists" },
  tenant_slug_key: { code: "SLUG_TAKEN", message: "This business URL is already taken" },
};

// Client mistakes the body parser reports, which must not be logged as server failures.
const HTTP_CLIENT_ERRORS: Record<number, { code: string; message: string }> = {
  413: { code: "PAYLOAD_TOO_LARGE", message: "Request body is too large" },
  415: { code: "UNSUPPORTED_MEDIA_TYPE", message: "Unsupported request encoding" },
};

interface PgError {
  code: string;
  constraint?: string;
}

const isPgError = (error: unknown): error is PgError =>
  typeof error === "object" && error !== null && "code" in error && typeof error.code === "string";

const isHttpClientError = (error: unknown): error is Error & { status: number } =>
  error instanceof Error &&
  "status" in error &&
  typeof error.status === "number" &&
  error.status >= 400 &&
  error.status < 500;

const sendError = (res: Response, status: number, code: string, message: string, details?: unknown) => {
  res.status(status).json({
    success: false,
    error: { message, code, ...(details === undefined ? {} : { details }) },
  });
};

export const notFoundHandler = (_req: Request, res: Response) => {
  sendError(res, 404, "NOT_FOUND", "Route not found");
};

export const errorHandler = (error: unknown, _req: Request, res: Response, next: NextFunction) => {
  // Once a response has started it can't be replaced; Express closes the connection.
  if (res.headersSent) {
    next(error);
    return;
  }

  if (error instanceof AppError) {
    sendError(res, error.statusCode, error.code, error.message, error.details);
    return;
  }

  if (error instanceof SyntaxError && "body" in error) {
    sendError(res, 400, "INVALID_JSON", "Request body is not valid JSON");
    return;
  }

  if (isHttpClientError(error)) {
    const mapped = HTTP_CLIENT_ERRORS[error.status];
    if (mapped) {
      sendError(res, error.status, mapped.code, mapped.message);
    } else {
      sendError(res, 400, "BAD_REQUEST", "Bad request");
    }
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
