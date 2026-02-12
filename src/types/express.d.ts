// types/express.d.ts - Type definitions for Express extensions
import { Request } from 'express';

declare global {
    namespace Express {
        interface Request {
            id: string;
            userId?: string;
            userRole?: string;
            rawBody?: Buffer;
            validatedQuery?: any;
            validatedParams?: any;
            validatedBody?: any;
        }
    }
}
