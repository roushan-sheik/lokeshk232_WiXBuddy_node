import { Request, Response, NextFunction } from "express";
import {
  AppError,
  AuthenticationError,
  ConflictError,
  NotFoundError,
  PayloadTooLargeError,
  ValidationError,
} from "./AppError";
import { AppLogger } from "../logging/logger";
import { HTTPStatusCode } from "@/types/HTTPStatusCode";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/client";
import { PrismaClientUnknownRequestError } from "@/generated/prisma/internal/prismaNamespace";

interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code: string;
    statusCode: number;
    timestamp: string;
    requestId: string;
    details?: unknown;
    stack?: string;
  };
}

export function errorHandler() {
  return (err: unknown, req: Request, res: Response, next: NextFunction) => {
    // If response already sent, delegate to Express default handler
    if (res.headersSent) {
      return next(err);
    }

    // Convert different error types to AppError
    const appError = normalizeError(err);

    // Build response
    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        message: appError.message,
        code: appError.code,
        statusCode: appError.statusCode,
        timestamp: new Date().toISOString(),
        requestId: (req as any).id || "unknown",
        ...(appError.details ? { details: appError.details } : {}),
        ...(process.env.NODE_ENV === "development"
          ? { stack: appError.stack }
          : {}),
      },
    };

    // Log the error
    logError(appError, req);

    // Send response
    res.status(appError.statusCode).json(errorResponse);
  };
}

function normalizeError(err: unknown): AppError {
  // Already an AppError
  if (err instanceof AppError) {
    return err;
  }

  // Handle Prisma errors
  if (err instanceof PrismaClientKnownRequestError) {
    return handlePrismaError(err);
  }

  if (err instanceof PrismaClientUnknownRequestError) {
    return new AppError(
      HTTPStatusCode.INTERNAL_SERVER_ERROR,
      "Database connection failed",
      "DATABASE_CONNECTION_ERROR",
      { originalError: err.message },
    );
  }

  // Handle validation errors (e.g., from Zod, Joi, etc.)
  if (err instanceof Error && err.name === "ValidationError") {
    return new ValidationError(err.message, { originalError: err });
  }

  // Handle JSON parsing errors
  if (err instanceof SyntaxError && "body" in err) {
    return new AppError(
      HTTPStatusCode.BAD_REQUEST,
      "Invalid JSON in request body",
      "INVALID_JSON",
      { originalError: err.message },
    );
  }

  // Handle multer errors (file upload)
  if (err instanceof Error && err.name === "MulterError") {
    return handleMulterError(err as any);
  }

  // Handle JWT errors
  if (err instanceof Error && err.name === "JsonWebTokenError") {
    return new AuthenticationError("Invalid token", {
      originalError: err.message,
    });
  }

  if (err instanceof Error && err.name === "TokenExpiredError") {
    return new AuthenticationError("Token expired", {
      originalError: err.message,
    });
  }

  // Generic Error
  if (err instanceof Error) {
    return new AppError(
      HTTPStatusCode.INTERNAL_SERVER_ERROR,
      err.message || "Internal server error",
      "INTERNAL_ERROR",
      { originalError: err.message, stack: err.stack },
    );
  }

  // Unknown error type
  return new AppError(
    HTTPStatusCode.INTERNAL_SERVER_ERROR,
    "An unknown error occurred",
    "UNKNOWN_ERROR",
    { originalError: String(err) },
  );
}

function handlePrismaError(err: PrismaClientKnownRequestError): AppError {
  switch (err.code) {
    case "P2002":
      return new ConflictError("A record with this data already exists", {
        fields: err.meta?.target,
        constraint: "unique_constraint",
      });

    case "P2025":
      return new NotFoundError("Record to update not found", {
        operation: err.meta,
      });

    case "P2003":
      return new AppError(
        HTTPStatusCode.BAD_REQUEST,
        "Foreign key constraint failed",
        "FOREIGN_KEY_ERROR",
        { constraint: err.meta },
      );

    case "P2014":
      return new AppError(
        HTTPStatusCode.BAD_REQUEST,
        "Invalid data provided",
        "INVALID_DATA",
        { relation: err.meta },
      );

    default:
      return new AppError(
        HTTPStatusCode.INTERNAL_SERVER_ERROR,
        "Database operation failed",
        "DATABASE_ERROR",
        {
          prismaCode: err.code,
          meta: err.meta,
        },
      );
  }
}

function handleMulterError(err: any): AppError {
  switch (err.code) {
    case "LIMIT_FILE_SIZE":
      return new PayloadTooLargeError("File too large");

    case "LIMIT_FILE_COUNT":
      return new AppError(
        HTTPStatusCode.BAD_REQUEST,
        "Too many files",
        "TOO_MANY_FILES",
      );

    case "LIMIT_UNEXPECTED_FILE":
      return new AppError(
        HTTPStatusCode.BAD_REQUEST,
        "Unexpected file field",
        "UNEXPECTED_FILE",
      );

    default:
      return new AppError(
        HTTPStatusCode.BAD_REQUEST,
        "File upload error",
        "FILE_UPLOAD_ERROR",
        { multerError: err.code },
      );
  }
}

function logError(error: AppError, req: Request): void {
  const logMeta = {
    requestId: (req as any).id,
    method: req.method,
    path: req.originalUrl || req.path,
    ip: req.headers["x-forwarded-for"] || req.ip,
    userAgent: req.get("User-Agent"),
    statusCode: error.statusCode,
    code: error.code,
    isOperational: error.isOperational,
    ...(error.details ? { details: error.details } : {}),
  };

  if (error.statusCode >= 500) {
    AppLogger.error(`❌ ${error.message}`, {
      ...logMeta,
      stack: error.stack,
    });
  } else if (error.statusCode >= 400) {
    AppLogger.warn(`⚠️ ${error.message}`, logMeta);
  } else {
    AppLogger.info(`ℹ️ ${error.message}`, logMeta);
  }
}
