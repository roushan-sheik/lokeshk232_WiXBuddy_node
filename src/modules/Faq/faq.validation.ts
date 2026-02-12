import { z } from "zod";

export const FaqValidation = {
  // Create Faq
  create: z
    .object({
      answer: z
        .string()
        .min(2, "Answer must be at least 2 characters")
        .max(100),
      question: z.string().max(500).optional(),
      type: z.enum(["message", "help"]).optional().default("message"),
    })
    .strict(),

  // Update Faq
  update: z
    .object({
      question: z.string().max(500).optional(),
      answer: z.string().max(500).optional(),
      type: z.enum(["message", "help"]).optional(),
    })
    .strict(),

  // Params validation
  params: {
    id: z.object({
      id: z.string().uuid("Invalid ID format"),
    }),
  },
};

export type CreateFaqInput = z.infer<typeof FaqValidation.create>;
export type UpdateFaqInput = z.infer<typeof FaqValidation.update>;
