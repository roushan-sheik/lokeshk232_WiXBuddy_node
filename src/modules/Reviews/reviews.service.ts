import { BaseService } from "@/core/BaseService";
import { PrismaClient } from "@/generated/prisma/client";
import { PaginationOptions } from "@/types/types";
import { CreateReviewsInput, UpdateReviewsInput } from "./reviews.validation";

export class ReviewsService extends BaseService<
  any,
  CreateReviewsInput,
  UpdateReviewsInput
> {
  constructor(prisma: PrismaClient) {
    super(prisma, "Review", {
      enableSoftDelete: true,
      enableAuditFields: true,
    });
  }

  protected getModel() {
    // @ts-ignore - The model 'reviews' might not exist in PrismaClient types yet
    return this.prisma.review;
  }

  // =========================================================================
  // Public API - Exposing BaseService methods
  // Since BaseService methods are protected, we must expose them here
  // =========================================================================

  public async create(data: CreateReviewsInput, userId: any, include?: any) {
    return super.create({ ...data, user_id: userId } as any, include);
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

  public async updateById(id: string, data: UpdateReviewsInput, include?: any) {
    return super.updateById(id, data, include);
  }

  public async deleteById(id: string) {
    return super.deleteById(id);
  }

  public async exists(filters: any) {
    return super.exists(filters);
  }
}
