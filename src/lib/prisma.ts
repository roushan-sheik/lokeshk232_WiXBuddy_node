import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

const connectionString = `${process.env.DATABASE_URL}`;

// Augment globalThis to prevent multiple instances during hot-reloads
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
    globalForPrisma.prisma ||
    (() => {
        const adapter = new PrismaPg({ connectionString });
        return new PrismaClient({ adapter });
    })();

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}
