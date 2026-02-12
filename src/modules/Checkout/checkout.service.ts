import { BaseService } from "@/core/BaseService";
import { PrismaClient } from "@/generated/prisma/client";
import { PaginationOptions } from "@/types/types";
import {
  CreateCheckoutInput,
  UpdateCheckoutInput,
} from "./checkout.validation";
import Razorpay from "razorpay";
import dayjs from "dayjs";
export class CheckoutService extends BaseService<
  any,
  CreateCheckoutInput,
  UpdateCheckoutInput
> {
  constructor(prisma: PrismaClient) {
    super(prisma, "Checkout", {
      enableSoftDelete: true,
      enableAuditFields: true,
    });
  }

  protected getModel() {
    // @ts-ignore - The model 'checkout' might not exist in PrismaClient types yet
    return this.prisma.checkout;
  }

  // =========================================================================
  // Public API - Exposing BaseService methods
  // Since BaseService methods are protected, we must expose them here
  // =========================================================================

  public async create(data: CreateCheckoutInput, include?: any) {
    return super.create(data, include);
  }

  public async findMany(
    filters: any = {},
    pagination?: Partial<PaginationOptions>,
    orderBy?: any,
    include?: any,
  ) {
    return super.findMany(filters, pagination, orderBy, include);
  }

  public async checkout(userId: any, couponCode?: string) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Get cart with items
      const cart = await tx.cart.findFirst({
        where: { userId },
        include: {
          cartItems: {
            include: {
              resaleTicket: true,
            },
          },
        },
      });

      if (!cart || cart.cartItems.length === 0) {
        return {
          success: false,
          message: "Cart is empty",
        };
      }

      // 2. Subtotal
      const subtotal = cart.cartItems.reduce((sum, item) => {
        return sum + Number(item.resaleTicket.price) * item.quantity;
      }, 0);

      let discount = 0;
      let couponId: number | null = null;

      // 3. Coupon Logic
      if (couponCode) {
        const coupon = await tx.coupon.findFirst({
          where: {
            code: couponCode,
            is_active: true,
            OR: [{ expires_at: null }, { expires_at: { gte: new Date() } }],
          },
        });

        if (coupon) {
          if (
            !coupon.min_order_amount ||
            subtotal >= Number(coupon.min_order_amount)
          ) {
            couponId = coupon.id;

            if (coupon.type === "fixed") {
              discount = Number(coupon.value);
            } else {
              discount = (Number(coupon.value) / 100) * subtotal;
            }
          }
        }
      }

      const total = Math.max(0, subtotal - discount);

      // 4. Create Order
      const order = await tx.order.create({
        data: {
          userId,
          order_number: `ORD-${dayjs().format("YYYYMMDDHHmmss")}`,
          subtotal,
          discount,
          total,
          couponId,
          payment_method: "razorpay",
          payment_status: "pending",
        },
      });

      // 5. Create Order Items
      for (const item of cart.cartItems) {
        await tx.orderItem.create({
          data: {
            orderId: order.id,
            resaleTicketId: item.resaleTicketId,
            quantity: item.quantity,
            price: item.resaleTicket.price,
          },
        });

        // Optional – after payment success e korba
        // await tx.resaleTicket.update({
        //   where: { id: item.resaleTicketId },
        //   data: {
        //     reserved_quantity: {
        //       decrement: item.quantity,
        //     },
        //     sold_quantity: {
        //       increment: item.quantity,
        //     },
        //   },
        // });
      }

      // 6. Razorpay Create Order
      const razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY!,
        key_secret: process.env.RAZORPAY_SECRET!,
      });

      const razorpayOrder = await razorpay.orders.create({
        receipt: order.order_number,
        amount: Math.round(total * 100),
        currency: "INR",
        payment_capture: 1,
      });

      // 7. Save razorpay order id
      await tx.order.update({
        where: { id: order.id },
        data: {
          razorpay_order_id: razorpayOrder.id,
        },
      });

      // 8. Empty Cart
      await tx.cartItem.deleteMany({
        where: {
          cartId: cart.id,
        },
      });

      return {
        success: true,
        data: {
          order,
          razorpay: {
            order_id: razorpayOrder.id,
            key: process.env.RAZORPAY_KEY,
            amount: Math.round(total * 100),
            currency: "INR",
          },
        },
      };
    });
  }

  public async findById(id: string, include?: any) {
    return super.findById(id, include);
  }

  public async updateById(
    id: string,
    data: UpdateCheckoutInput,
    include?: any,
  ) {
    return super.updateById(id, data, include);
  }

  public async deleteById(id: string) {
    return super.deleteById(id);
  }

  public async exists(filters: any) {
    return super.exists(filters);
  }
}
