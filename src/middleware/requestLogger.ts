import { AppLogger } from '@/core/logging/logger';
import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export function requestLogger() {
    return (req: Request, res: Response, next: NextFunction) => {
        const start = Date.now();

        // Ensure requestId exists
        const requestId = (req as any).id || crypto.randomUUID();
        (req as any).id = requestId;

        // Capture basic request info
        const requestMeta = {
            requestId,
            ip: req.headers['x-forwarded-for'] || req.ip,
            method: req.method,
            path: req.originalUrl || req.url,
            userAgent: req.get('User-Agent'),
            query: req.query,
            params: req.params,
            ...(process.env.NODE_ENV === 'development' && req.body ? { body: req.body } : {}), // log body only in dev
        };

        // Listen for response end
        res.on('finish', () => {
            const duration = Date.now() - start;

            const responseMeta = {
                ...requestMeta,
                statusCode: res.statusCode,
                durationMs: duration,
                contentLength: res.get('Content-Length') || 0,
                contentType: res.get('Content-Type') || '',
            };

            AppLogger.info(`📩 HTTP Request completed`, responseMeta);
        });

        // Listen for aborted requests
        res.on('close', () => {
            if (!res.writableEnded) {
                const duration = Date.now() - start;
                AppLogger.warn(`⚠️ HTTP Request aborted by client`, {
                    ...requestMeta,
                    durationMs: duration,
                });
            }
        });

        next();
    };
}
