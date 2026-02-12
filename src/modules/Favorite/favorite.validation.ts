import { z } from "zod";

export const FavoriteValidation = {
  // Create Favorite
  create: z
    .object({
      status: z.enum(["interest", "going"]).optional().default("interest"),
      user_id: z.string().optional(),
      event_id: z.string().optional(),
    })
    .strict(),

  // Update Favorite
  update: z
    .object({
      status: z.enum(["interest", "going"]).optional(),
    })
    .strict(),

  // Params validation
  params: {
    id: z.object({
      id: z.string().uuid("Invalid ID format"),
    }),
  },
};

export type CreateFavoriteInput = z.infer<typeof FavoriteValidation.create>;
export type UpdateFavoriteInput = z.infer<typeof FavoriteValidation.update>;
