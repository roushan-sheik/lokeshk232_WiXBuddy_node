import { BaseService } from "@/core/BaseService";
import { PrismaClient } from "@/generated/prisma/client";
import { PaginationOptions } from "@/types/types";
import { CreateFaqInput, UpdateFaqInput } from "./faq.validation";

export class FaqService extends BaseService<
  any,
  CreateFaqInput,
  UpdateFaqInput
> {
  constructor(prisma: PrismaClient) {
    super(prisma, "Faq", {
      enableSoftDelete: true,
      enableAuditFields: true,
    });
  }

  protected getModel() {
    // @ts-ignore - The model 'faq' might not exist in PrismaClient types yet
    return this.prisma.faq;
  }

  // =========================================================================
  // Public API - Exposing BaseService methods
  // Since BaseService methods are protected, we must expose them here
  // =========================================================================

  public async create(data: CreateFaqInput, include?: any) {
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

  public async findById(id: string, include?: any) {
    return super.findById(Number(id), include);
  }

  public async updateById(id: string, data: UpdateFaqInput, include?: any) {
    return super.updateById(id, data, include);
  }

  public async deleteById(id: string) {
    return super.deleteById(id);
  }

  public async exists(filters: any) {
    return super.exists(filters);
  }
}
