import { z } from "zod";

export const CartValidation = {
  // Create Cart
  create: z
    .object({
      resale_ticket_id: z.coerce
        .number()
        .int("resale_ticket_id must be an integer")
        .min(2, "resale_ticket_id must be at least 2"),

      quantity: z.coerce
        .number()
        .int("quantity must be an integer")
        .min(1, "quantity must be at least 1"),
    })
    .strict(),

  // Update Cart
  update: z
    .object({
      name: z.string().min(2).max(100).optional(),
      description: z.string().max(500).optional(),
      status: z.enum(["active", "inactive"]).optional(),
    })
    .strict(),

  // Params validation
  params: {
    id: z.object({
      id: z.string().uuid("Invalid ID format"),
    }),
  },
};

export type CreateCartInput = z.infer<typeof CartValidation.create>;
export type UpdateCartInput = z.infer<typeof CartValidation.update>;
