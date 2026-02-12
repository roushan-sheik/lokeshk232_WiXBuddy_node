// middleware/security.ts - Additional security middleware
import { Request, Response, NextFunction } from 'express';
import { HTTPStatusCode } from '@/types/HTTPStatusCode';
import { AppError } from '@/core/errors/AppError';

export function securityHeaders() {
    return (req: Request, res: Response, next: NextFunction) => {
        // Remove server header
        res.removeHeader('x-powered-by');

        // Add security headers
        res.setHeader('x-content-type-options', 'nosniff');
        res.setHeader('x-frame-options', 'DENY');
        res.setHeader('x-xss-protection', '1; mode=block');
        res.setHeader('referrer-policy', 'strict-origin-when-cross-origin');

        // Add request size limits check
        const contentLength = parseInt(req.get('content-length') || '0');
        const maxSize = 10 * 1024 * 1024; // 10MB

        if (contentLength > maxSize) {
            return next(
                new AppError(
                    HTTPStatusCode.PAYLOAD_TOO_LARGE,
                    'Request payload too large',
                    'PAYLOAD_TOO_LARGE',
                    { maxSize, received: contentLength }
                )
            );
        }

        next();
    };
}
