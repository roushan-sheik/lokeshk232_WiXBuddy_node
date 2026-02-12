import { z } from 'zod';

export const MagazineValidation = {
    // Create Magazine
    create: z.object({
        name: z.string().min(2, 'Name must be at least 2 characters').max(100),
        description: z.string().max(500).optional(),
        status: z.enum(['active', 'inactive']).optional().default('active'),
    }).strict(),

    // Update Magazine
    update: z.object({
        name: z.string().min(2).max(100).optional(),
        description: z.string().max(500).optional(),
        status: z.enum(['active', 'inactive']).optional(),
    }).strict(),

    // Params validation
    params: {
        id: z.object({
            id: z.string().uuid('Invalid ID format'),
        }),
    }
};

export type CreateMagazineInput = z.infer<typeof MagazineValidation.create>;
export type UpdateMagazineInput = z.infer<typeof MagazineValidation.update>;
