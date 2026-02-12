import { AppLogger } from './logging/logger';
import { config } from './config';
import { prisma } from '@/lib/prisma';
import { PrismaClient } from '@/generated/prisma/client';

export class Context {
    public prisma: PrismaClient;
    public config: typeof config;

    constructor() {
        // Use the singleton instance with adapter configuration
        this.prisma = prisma;
        this.config = config;
    }

    public async initialize(): Promise<void> {
        try {
            await this.prisma.$connect();
            AppLogger.info('⛁ Database connected successfully');
        } catch (error) {
            AppLogger.error('❌ Database connection failed', error);
            throw error;
        }
    }

    public async shutdown(): Promise<void> {
        try {
            await this.prisma.$disconnect();
            AppLogger.info('⛁ Database disconnected successfully');
        } catch (error) {
            AppLogger.error('❌ Database disconnection failed', error);
            throw error;
        }
    }
}
