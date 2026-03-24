import { BaseService } from '@/core/BaseService';
import { PrismaClient } from '@/generated/prisma/client';
import { PaginationOptions } from '@/types/types';
import { CreateTestInput, UpdateTestInput } from './test.validation';

export class TestService extends BaseService<any, CreateTestInput, UpdateTestInput> { 
    
    constructor(prisma: PrismaClient) {
        super(prisma, 'Test', {
            enableSoftDelete: true,
            enableAuditFields: true
        });
    }

    protected getModel() {
        // @ts-ignore - The model 'test' might not exist in PrismaClient types yet
        return this.prisma.test; 
    }

    // =========================================================================
    // Public API - Exposing BaseService methods
    // Since BaseService methods are protected, we must expose them here
    // =========================================================================

    public async create(data: CreateTestInput, include?: any) {
        return super.create(data, include);
    }

    public async findMany(
        filters: any = {},
        pagination?: Partial<PaginationOptions>,
        orderBy?: any,
        include?: any
    ) {
        return super.findMany(filters, pagination, orderBy, include);
    }

    public async findById(id: string, include?: any) {
        return super.findById(id, include);
    }

    public async updateById(id: string, data: UpdateTestInput, include?: any) {
        return super.updateById(id, data, include);
    }

    public async deleteById(id: string) {
        return super.deleteById(id);
    }

    public async exists(filters: any) {
        return super.exists(filters);
    }
}
