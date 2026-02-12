import { HTTPStatusCode } from '@/types/HTTPStatusCode';
import { config } from '../config';

export class AppError extends Error {
    public readonly isOperational: boolean = true;

    constructor(
        public statusCode: HTTPStatusCode,
        public message: string,
        public code: string = 'APP_ERROR',
        public details?: unknown
    ) {
        super(message);
        this.name = this.constructor.name;
        Error.captureStackTrace?.(this, this.constructor);
    }

    toJSON() {
        return {
            name: this.name,
            message: this.message,
            code: this.code,
            statusCode: this.statusCode,
            isOperational: this.isOperational,
            ...(config.server.env === 'development' && this.details
                ? { details: this.details }
                : {}),
        };
    }
}

// Specific Error Classes
export class ValidationError extends AppError {
    constructor(message = 'Validation failed', details?: unknown) {
        super(HTTPStatusCode.BAD_REQUEST, message, 'VALIDATION_ERROR', details);
    }
}

export class NotFoundError extends AppError {
    constructor(resource = 'Resource', details?: unknown) {
        super(HTTPStatusCode.NOT_FOUND, `${resource} not found`, 'NOT_FOUND', details);
    }
}

export class AuthenticationError extends AppError {
    constructor(message = 'Authentication required', details?: unknown) {
        super(HTTPStatusCode.UNAUTHORIZED, message, 'AUTHENTICATION_ERROR', details);
    }
}

export class AuthorizationError extends AppError {
    constructor(message = 'Insufficient permissions', details?: unknown) {
        super(HTTPStatusCode.FORBIDDEN, message, 'AUTHORIZATION_ERROR', details);
    }
}

export class ConflictError extends AppError {
    constructor(message = 'Resource conflict', details?: unknown) {
        super(HTTPStatusCode.CONFLICT, message, 'CONFLICT_ERROR', details);
    }
}

export class RateLimitError extends AppError {
    constructor(message = 'Too many requests', details?: unknown) {
        super(HTTPStatusCode.TOO_MANY_REQUESTS, message, 'RATE_LIMIT_ERROR', details);
    }
}

export class PayloadTooLargeError extends AppError {
    constructor(message = 'Payload too large', details?: unknown) {
        super(HTTPStatusCode.PAYLOAD_TOO_LARGE, message, 'PAYLOAD_TOO_LARGE', details);
    }
}

export class DatabaseError extends AppError {
    constructor(message = 'Database operation failed', details?: unknown) {
        super(HTTPStatusCode.INTERNAL_SERVER_ERROR, message, 'DATABASE_ERROR', details);
    }
}

export class ExternalServiceError extends AppError {
    constructor(message = 'External service error', details?: unknown) {
        super(HTTPStatusCode.BAD_GATEWAY, message, 'EXTERNAL_SERVICE_ERROR', details);
    }
}

export class TimeoutError extends AppError {
    constructor(message = 'Request timeout', details?: unknown) {
        super(HTTPStatusCode.REQUEST_TIMEOUT, message, 'TIMEOUT_ERROR', details);
    }
}

export class BadRequestError extends AppError {
    constructor(message = 'Bad request', details?: unknown) {
        super(HTTPStatusCode.BAD_REQUEST, message, 'BAD_REQUEST_ERROR', details);
    }
}
