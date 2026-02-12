import { z } from "zod";

export const ContactValidation = {
  // Create Contact
  create: z
    .object({
      first_name: z.string().min(1).max(100),
      last_name: z.string().max(100).optional().nullable(),

      company_name: z.string().min(1),
      company_type: z.string().min(1),

      region: z.string().min(1).max(100),

      email: z.string().email().max(50),

      phone: z.string().min(1).max(20),

      message: z.string().min(1),
    })
    .strict(),

  // Update Contact
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

export type CreateContactInput = z.infer<typeof ContactValidation.create>;
export type UpdateContactInput = z.infer<typeof ContactValidation.update>;
