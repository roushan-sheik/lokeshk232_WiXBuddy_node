import { BaseService } from "@/core/BaseService";
import { PrismaClient } from "@/generated/prisma/client";
import { PaginationOptions } from "@/types/types";
import { CreateCartInput, UpdateCartInput } from "./cart.validation";
import dayjs, { Dayjs } from "dayjs";
export class CartService extends BaseService<
  any,
  CreateCartInput,
  UpdateCartInput
> {
  constructor(prisma: PrismaClient) {
    super(prisma, "Cart", {
      enableSoftDelete: true,
      enableAuditFields: true,
    });
  }

  protected getModel() {
    // @ts-ignore - The model 'cart' might not exist in PrismaClient types yet
    return this.prisma.cart;
  }

  // =========================================================================
  // Public API - Exposing BaseService methods
  // Since BaseService methods are protected, we must expose them here
  // =========================================================================

  public async create(
    data: CreateCartInput,
    userId: any,
    sessionId?: string,
    include?: any,
  ) {
    const { resale_ticket_id, quantity = 1 } = data;
    const qty = Math.max(1, quantity);

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        // 1. Fetch ticket
        const ticket = await tx.resaleTicket.findUnique({
          where: { id: resale_ticket_id },
          select: {
            id: true,
            price: true,
            quantity: true,
            reserved_quantity: true,
            status: true,
          },
        });

        if (!ticket) throw new Error("Ticket not found");

        // 2. Find or create cart
        let cart = await tx.cart.findFirst({
          where: userId ? { userId } : { sessionId },
        });

        if (!cart) {
          cart = await tx.cart.create({
            data: {
              userId: userId ?? null,
              sessionId: sessionId ?? null,
            },
          });
        }

        // 3. Check if ticket already in cart
        const existingItem = await tx.cartItem.findFirst({
          where: {
            cartId: cart.id,
            resaleTicketId: resale_ticket_id,
            isPurchased: false,
          },
        });

        if (existingItem) {
          throw new Error("This ticket is already in your cart.");
        }

        // 4. Check availability
        const available =
          ticket.reserved_quantity !== null
            ? (ticket.quantity ?? 0) - (ticket.reserved_quantity ?? 0)
            : (ticket.status as string) === "available"
              ? 1
              : 0;

        if (available < qty) {
          throw new Error(
            `Not enough tickets available. Available: ${available}`,
          );
        }

        // 5. Create cart item
        const cartItem = await tx.cartItem.create({
          data: {
            cartId: cart.id,
            resaleTicketId: resale_ticket_id,
            quantity: qty,
            price: ticket.price,
            totalPrice: Number(ticket.price) * qty,
            reservedUntil: dayjs().add(15, "minute").toDate(),
          },
          include,
        });

        // 6. Update reserved quantity
        if (ticket.reserved_quantity !== null) {
          await tx.resaleTicket.update({
            where: { id: resale_ticket_id },
            data: {
              reserved_quantity: (ticket.reserved_quantity ?? 0) + qty,
            },
          });
        }

        return cartItem;
      });

      return {
        success: true,
        message: "Added to cart.",
        data: result,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Failed to add ticket to cart",
      };
    }
  }

  public async findMany(
    filters: any = {},
    pagination?: Partial<PaginationOptions>,
    orderBy?: any,
    include?: any,
  ) {
    return super.findMany(filters, pagination, orderBy, include);
  }

  public async findById(id: string, include?: any) {
    return super.findById(id, include);
  }

  public async updateById(id: string, data: UpdateCartInput, include?: any) {
    return super.updateById(id, data, include);
  }

  public async deleteById(id: string) {
    return super.deleteById(id);
  }

  public async exists(filters: any) {
    return super.exists(filters);
  }
}
