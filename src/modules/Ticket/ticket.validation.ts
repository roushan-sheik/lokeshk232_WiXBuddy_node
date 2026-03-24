import { z } from 'zod';

export const TicketValidation = {
  // ================= CREATE =================
  create: z.object({
    // ===== Event Info =====
    event_id: z.string().optional(),
    ticketmaster_id: z.string().optional(),

    event_title: z.string().optional(),
    title: z.string().optional(),
    venue: z.string(),
    location: z.string(),

    artist: z.string().optional(),
    category: z.string().optional(),

    // ===== Date & Time =====
    start_date: z.coerce.date(),
    end_date: z.coerce.date(),
    time: z.string(), // "18:30:00" → convert later if needed

    // ===== Geo =====
    latitude: z.coerce.number(),
    longitude: z.coerce.number(),

    mapUrl: z.string().url().optional(),
    imageUrl: z.string().url().optional(),

    // ===== Quantity =====
    quantity: z.coerce.number().int().min(1).default(1),
    reserved_quantity: z.coerce.number().int().min(0).optional(),
    sold_quantity: z.coerce.number().int().min(0).optional(),

    // ===== Pricing =====
    original_price: z.coerce.number().positive(),
    price: z.coerce.number().positive(),

    // ===== Ticket Details =====
    ticket_type: z.string().default('Regular'),
    seat_info: z.string().optional(),
    additional_info: z.string().optional(),

    // ===== Status =====
    status: z.enum(['pending', 'approved', 'rejected']).optional(),

    // ===== Financial Profile =====
    country_of_residence: z.string(),
    address: z.string(),
    city: z.string(),
    postal_code: z.string(),

    bank_country: z.string(),
    account_holder_name: z.string(),
    phone_number: z.string(),
    bank_account_number: z.string(),
  }),

  // ================= UPDATE =================
  update: z.object({
    title: z.string().optional(),
    venue: z.string().optional(),
    artist: z.string().optional(),
    category: z.string().optional(),

    start_date: z.coerce.date().optional(),
    end_date: z.coerce.date().optional(),
    time: z.coerce.date().optional(),

    quantity: z.coerce.number().int().min(1).optional(),
    price: z.coerce.number().positive().optional(),
    ticket_type: z.string().optional(),
    seat_info: z.string().optional(),
    additional_info: z.string().optional(),

    status: z.enum(['pending', 'approved', 'rejected']).optional(),
    admin_notes: z.string().optional(),
  }),

  // ================= PARAMS =================
  params: {
    id: z.object({
      id: z.coerce.number().int(),
    }),
  },
};

export type CreateTicketInput = z.infer<typeof TicketValidation.create>;
export type UpdateTicketInput = z.infer<typeof TicketValidation.update>;
