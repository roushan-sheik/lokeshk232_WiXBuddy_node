import { BaseService } from '@/core/BaseService';
import { PrismaClient } from '@/generated/prisma/client';
import { PaginationOptions } from '@/types/types';
import { CreateContactInput, UpdateContactInput } from './contact.validation';

export class ContactService extends BaseService<any, CreateContactInput, UpdateContactInput> { 
    
    constructor(prisma: PrismaClient) {
        super(prisma, 'Contact', {
            enableSoftDelete: true,
            enableAuditFields: true
        });
    }

    protected getModel() {
        // @ts-ignore - The model 'contact' might not exist in PrismaClient types yet
        return this.prisma.contact; 
    }

    // =========================================================================
    // Public API - Exposing BaseService methods
    // Since BaseService methods are protected, we must expose them here
    // =========================================================================

    public async create(data: CreateContactInput, include?: any) {
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

    public async updateById(id: string, data: UpdateContactInput, include?: any) {
        return super.updateById(id, data, include);
    }

    public async deleteById(id: string) {
        return super.deleteById(id);
    }

    public async exists(filters: any) {
        return super.exists(filters);
    }
}
