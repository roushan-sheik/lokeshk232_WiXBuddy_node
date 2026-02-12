// middleware/requestId.ts - Proper request ID middleware
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export function requestId() {
    return (req: Request, res: Response, next: NextFunction) => {
        // Check if request ID already exists (maybe from load balancer)
        const existingId = req.headers['x-request-id'] || req.headers['x-correlation-id'];

        req.id = typeof existingId === 'string' ? existingId : uuidv4();

        // Add request ID to response headers for debugging
        res.setHeader('x-request-id', req.id);

        next();
    };
}
