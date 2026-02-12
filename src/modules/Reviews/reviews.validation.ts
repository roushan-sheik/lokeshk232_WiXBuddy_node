import { z } from "zod";

export const ReviewsValidation = {
  // Create Review
  create: z
    .object({
      rating: z.preprocess(
        (val) => (typeof val === "string" ? Number(val) : val),
        z
          .number()
          .int("Rating must be an integer")
          .min(1, "Rating must be at least 1")
          .max(5, "Rating cannot be more than 5"),
      ),

      comment: z
        .string()
        .max(500, "Comment cannot exceed 500 characters")
        .optional(),
    })
    .strict(),

  // Update Review
  update: z
    .object({
      rating: z
        .preprocess(
          (val) => (typeof val === "string" ? Number(val) : val),
          z.number().int().min(1).max(5),
        )
        .optional(),

      comment: z.string().max(500).optional(),
    })
    .strict(),

  // Params validation
  params: {
    id: z.object({
      id: z.string().regex(/^\d+$/, "Invalid ID format"),
    }),
  },
};

export type CreateReviewsInput = z.infer<typeof ReviewsValidation.create>;
export type UpdateReviewsInput = z.infer<typeof ReviewsValidation.update>;
