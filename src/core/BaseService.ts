// src/core/BaseService.ts
import { Response } from "express";
import { AppLogger } from "./logging/logger";
import { DatabaseError, NotFoundError } from "./errors/AppError";
import {
  FilterHandler,
  PaginationOptions,
  PaginationResult,
} from "@/types/types";
import slugify from "slugify";
import { PrismaClient } from "@/generated/prisma/client";

// Type for base service options
export interface BaseServiceOptions {
  enableSoftDelete?: boolean;
  enableAuditFields?: boolean;
  defaultPageSize?: number;
  maxPageSize?: number;
}

// Type for Prisma transaction callback
type TransactionCallback<T> = (
  tx: Omit<
    PrismaClient,
    "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends"
  >,
) => Promise<T>;

export abstract class BaseService<
  TModel = any,
  TCreateInput = any,
  TUpdateInput = any,
> {
  protected prisma: PrismaClient;
  protected modelName: string;
  protected options: BaseServiceOptions;
  protected filterMap: Record<string, FilterHandler> = {};

  // SSE client storage - only initialized if SSE is enabled
  protected sseClients: Map<string, Response[]> = new Map();

  // Constructor
  constructor(
    prisma: PrismaClient,
    modelName: string,
    options: BaseServiceOptions = {},
  ) {
    this.prisma = prisma;
    this.modelName = modelName;
    this.options = {
      enableSoftDelete: false,
      enableAuditFields: false,
      defaultPageSize: 10,
      maxPageSize: 1000,
      ...options,
    };
  }

  /**
   * Get the Prisma model delegate
   * Override this method to return the appropriate model
   */
  protected abstract getModel(): any;

  /**
   * Create a new record with optional relation inclusions
   */
  protected async create(data: TCreateInput, include?: any): Promise<TModel> {
    try {
      const createData = this.prepareCreateData(data);

      const result = await this.getModel().create({
        data: createData,
        include, // Only used to fetch related data (e.g., { posts: true })
      });

      return result as TModel;
    } catch (error) {
      return this.handleDatabaseError(error, "create");
    }
  }

  /**
   * Update a record by ID with optional relation inclusions
   */
  protected async updateById(
    id: string | number,
    data: TUpdateInput,
    include?: any,
  ): Promise<TModel> {
    try {
      const updateData = this.prepareUpdateData(data);

      const result = await this.getModel().update({
        where: { id },
        data: updateData,
        include,
      });

      return result as TModel;
    } catch (error) {
      return this.handleDatabaseError(error, "updateById");
    }
  }

  /**
   * Delete a record by ID
   */
  protected async deleteById(id: string | number): Promise<TModel> {
    try {
      let result: TModel;

      if (this.options.enableSoftDelete) {
        result = await this.softDelete(id);
      } else {
        result = await this.getModel().delete({
          where: { id },
        });
      }

      return result as TModel;
    } catch (error) {
      return this.handleDatabaseError(error, "deleteById");
    }
  }

  // ========== QUERY METHODS ==========

  /**
   * Find many records with optional filters, pagination, and relation inclusions
   */
  protected async findMany(
    filters: any = {},
    pagination?: Partial<PaginationOptions>,
    orderBy?: Record<string, "asc" | "desc">,
    include?: any,
  ): Promise<PaginationResult<TModel>> {
    try {
      const where = this.buildWhereClause(filters);

      // Ensure we always have pagination parameters
      const finalPagination = this.normalizePagination(pagination);

      if (!orderBy) {
        orderBy = { id: "desc" };
      }

      const [data, total] = await Promise.all([
        this.getModel().findMany({
          where,
          skip: finalPagination.offset,
          take: finalPagination.limit,
          orderBy,
          include,
        }),
        this.getModel().count({ where }),
      ]);

      return this.buildPaginationResult(data, total, finalPagination);
    } catch (error) {
      return this.handleDatabaseError(error, "findMany");
    }
  }

  /**
   * Find many records without pagination (for internal use)
   * Returns plain array - use sparingly and only for internal operations
   */
  protected async findManyInternal(
    filters: any = {},
    orderBy?: Record<string, "asc" | "desc">,
    include?: any,
    limit?: number,
  ): Promise<TModel[]> {
    try {
      const where = this.buildWhereClause(filters);

      if (!orderBy) {
        orderBy = { id: "desc" };
      }

      const result = await this.getModel().findMany({
        where,
        orderBy,
        include,
        take: limit || this.options.maxPageSize,
      });

      return result as TModel[];
    } catch (error) {
      return this.handleDatabaseError(error, "findManyInternal");
    }
  }

  /**
   * Find a single record by ID with optional relation inclusions
   */
  protected async findById(
    id: string | number,
    include?: any,
  ): Promise<TModel | null> {
    try {
      const where = this.buildWhereClause({ id });

      const result = await this.getModel().findFirst({
        where,
        include,
      });

      return result as TModel | null;
    } catch (error) {
      return this.handleDatabaseError(error, "findById");
    }
  }

  /**
   * Find a single record by filters with optional relation inclusions
   */
  protected async findOne(filters: any, include?: any): Promise<TModel | null> {
    try {
      const where = this.buildWhereClause(filters);

      const result = await this.getModel().findFirst({
        where,
        include,
      });

      return result as TModel | null;
    } catch (error) {
      return this.handleDatabaseError(error, "findOne");
    }
  }

  /**
   * Soft delete a record
   */
  protected async softDelete(id: string | number): Promise<TModel> {
    try {
      const result = await this.getModel().update({
        where: { id },
        data: {
          deletedAt: new Date(),
          isDeleted: true,
        },
      });

      return result as TModel;
    } catch (error) {
      return this.handleDatabaseError(error, "softDelete");
    }
  }

  /**
   * Check if a record exists
   */
  protected async exists(filters: any): Promise<boolean> {
    try {
      const where = this.buildWhereClause(filters);
      const count = await this.getModel().count({ where });
      return count > 0;
    } catch (error) {
      return this.handleDatabaseError(error, "exists");
    }
  }

  /**
   * Count records with optional filters
   */
  protected async count(filters: any = {}): Promise<number> {
    try {
      const where = this.buildWhereClause(filters);
      return await this.getModel().count({ where });
    } catch (error) {
      return this.handleDatabaseError(error, "count");
    }
  }

  // ========== HELPER METHODS ==========

  /**
   * Normalize pagination parameters with defaults
   */
  private normalizePagination(
    pagination?: Partial<PaginationOptions>,
  ): PaginationOptions {
    const page = Math.max(1, pagination?.page || 1);
    const limit = Math.min(
      this.options.maxPageSize!,
      Math.max(1, pagination?.limit || this.options.defaultPageSize!),
    );
    const offset = (page - 1) * limit;

    return { page, limit, offset };
  }

  /**
   * Build pagination result object
   */
  private buildPaginationResult<T>(
    data: T[],
    total: number,
    pagination: PaginationOptions,
  ): PaginationResult<T> {
    const totalPages = Math.ceil(total / pagination.limit);

    return {
      data,
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages,
      hasNext: pagination.page < totalPages,
      hasPrevious: pagination.page > 1,
    };
  }

  /**
   * Build where clause with soft delete consideration
   */
  protected buildWhereClause(filters: any): any {
    if (this.options.enableSoftDelete) {
      return {
        ...filters,
        // deleted_at: null,
      };
    }
    return filters;
  }

  /**
   * Prepare data for create operation
   */
  private prepareCreateData(data: TCreateInput): any {
    if (this.options.enableAuditFields) {
      return {
        ...data,
        created_at: new Date(),
        updated_at: new Date(),
      };
    }
    return data;
  }

  /**
   * Prepare data for update operation
   */
  private prepareUpdateData(data: TUpdateInput): any {
    if (this.options.enableAuditFields) {
      return {
        ...data,
        updated_at: new Date(),
      };
    }
    return data;
  }

  /**
   * Handle database errors and convert to appropriate AppError
   */
  private handleDatabaseError(error: any, operation: string): never {
    AppLogger.error(`Database error in ${this.modelName}.${operation}`, {
      error: error instanceof Error ? error.message : String(error),
      code: error.code,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });

    // Map operation name to friendly message
    const operationMessages: Record<string, string> = {
      findMany: `Failed to retrieve ${this.modelName.toLowerCase()} list`,
      findById: `Failed to retrieve ${this.modelName.toLowerCase()}`,
      findOne: `Failed to retrieve ${this.modelName.toLowerCase()}`,
      create: `Failed to create ${this.modelName.toLowerCase()}`,
      updateById: `Failed to update ${this.modelName.toLowerCase()}`,
      deleteById: `Failed to delete ${this.modelName.toLowerCase()}`,
      softDelete: `Failed to delete ${this.modelName.toLowerCase()}`,
      transaction: `Database transaction failed`,
    };

    const safeMessage =
      operationMessages[operation] || `Database operation failed`;

    if (error.code === "P2025") {
      throw new NotFoundError(`${this.modelName} not found`);
    }

    throw new DatabaseError(
      safeMessage,
      process.env.NODE_ENV === "development"
        ? { originalError: error.message, code: error.code }
        : undefined,
    );
  }

  /**
   * Execute a database transaction
   */
  protected async transaction<T>(callback: TransactionCallback<T>): Promise<T> {
    try {
      return await this.prisma.$transaction(callback);
    } catch (error) {
      return this.handleDatabaseError(error, "transaction");
    }
  }

  /**
   * Merge filters deeply to handle numeric ranges correctly
   */
  protected mergeFilters(current: any, addition: any) {
    for (const key of Object.keys(addition)) {
      if (
        typeof addition[key] === "object" &&
        addition[key] !== null &&
        !Array.isArray(addition[key])
      ) {
        current[key] = current[key] || {};
        current[key] = { ...current[key], ...addition[key] };
      } else {
        current[key] = addition[key];
      }
    }
    return current;
  }

  /**
   * Apply filters from a query object
   */
  protected applyFilters(query: Record<string, any>): any {
    let filters: any = {};

    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && this.filterMap[key]) {
        filters = this.mergeFilters(filters, this.filterMap[key](value));
      }
    });

    return filters;
  }

  /**
   * Generate a unique slug for a given title
   */
  protected async generateUniqueSlug(
    title: string,
    excludeId?: string,
  ): Promise<string> {
    const baseSlug = slugify(title, { lower: true, strict: true });

    const existingSlugs: { slug: string }[] = await this.getModel().findMany({
      where: {
        slug: { startsWith: baseSlug },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { slug: true }, // Using select here explicitly because we only need the slug
    });

    const existingSet = new Set(existingSlugs.map((s) => s.slug));

    let slug = baseSlug;
    let counter = 1;
    while (existingSet.has(slug)) {
      slug = `${baseSlug}-${counter++}`;
    }

    return slug;
  }
}
