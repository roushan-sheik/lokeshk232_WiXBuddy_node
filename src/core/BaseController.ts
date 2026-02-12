// src/core/BaseController.ts
import { Request, Response } from 'express';
import { AppLogger } from './logging/logger';
import { HTTPStatusCode } from '@/types/HTTPStatusCode';
import { ApiResponse, PaginatedResponse } from '@/types/types';
import { config } from './config'; // ✨ Import config to check environment

export abstract class BaseController {
    protected setAuthCookie(res: Response, token: string): void {
        const cookieName = 'auth_token';
        const maxAge = 24 * 60 * 60 * 1000; // 24h

        // Check if we are in a production environment (HTTPS)
        const isProduction = config.server.isProduction;

        // Set cookie
        res.cookie(cookieName, token, {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            maxAge,
            path: '/',
        });

        // Debug logging in non-production
        if (!isProduction) {
            console.log('🍪 Auth Cookie Set:', {
                name: cookieName,
                secure: isProduction,
                sameSite: isProduction ? 'none' : 'lax',
                env: config.server.env,
            });
        }
    }

    /**
     * Clear authentication cookies
     */
    protected clearAuthCookie(res: Response): void {
        const isProduction = config.server.isProduction;

        const cookieOptions = {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? ('none' as const) : ('lax' as const),
            path: '/',
        };

        res.clearCookie('auth_token', cookieOptions);
    }

    /**
     * Send a successful response
     */
    protected sendResponse<T>(
        res: Response,
        message?: string,
        statusCode: HTTPStatusCode = HTTPStatusCode.OK,
        data?: T
    ): Response<ApiResponse<T>> {
        const response: ApiResponse<T> = {
            success: true,
            message,
            meta: {
                requestId: (res.req as any).id,
                timestamp: new Date().toISOString(),
            },
            data,
        };

        return res.status(statusCode).json(response);
    }

    /**
     * Send a paginated response
     */
    protected sendPaginatedResponse<T>(
        res: Response,
        pagination: PaginatedResponse<T>['meta']['pagination'],
        message?: string,
        data?: T[]
    ): Response<PaginatedResponse<T>> {
        const response: PaginatedResponse<T> = {
            success: true,
            message,
            meta: {
                requestId: (res.req as any).id,
                timestamp: new Date().toISOString(),
                pagination,
            },
            data,
        };

        return res.status(HTTPStatusCode.OK).json(response);
    }

    /**
     * Send a created response
     */
    protected sendCreatedResponse<T>(
        res: Response,
        data: T,
        message: string = 'Resource created successfully'
    ): Response<ApiResponse<T>> {
        return this.sendResponse(res, message, HTTPStatusCode.CREATED, data);
    }

    /**
     * Send a no content response
     */
    protected sendNoContentResponse(res: Response): Response {
        return res.status(HTTPStatusCode.NO_CONTENT).send();
    }

    /**
     * Extract pagination parameters from request
     */
    protected extractPaginationParams(req: Request): {
        page: number;
        limit: number;
        offset: number;
    } {
        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
        const offset = (page - 1) * limit;

        return { page, limit, offset };
    }

    /**
     * Calculate pagination metadata
     */
    protected calculatePagination(
        page: number,
        limit: number,
        total: number
    ): PaginatedResponse['meta']['pagination'] {
        const totalPages = Math.ceil(total / limit);

        return {
            page,
            limit,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrevious: page > 1,
        };
    }

    // ========== UTILITY METHODS ==========

    /**
     * Log controller action
     */
    protected logAction(action: string, req: Request, metadata?: any): void {
        AppLogger.info(`Controller action: ${action}`, {
            requestId: (req as any).id,
            userId: (req as any).userId,
            method: req.method,
            path: req.path,
            ...metadata,
        });
    }

    /**
     * Extract user ID from request (assuming it's set by auth middleware)
     */
    protected getUserId(req: Request): string | undefined {
        return (req as any).userId;
    }
}
