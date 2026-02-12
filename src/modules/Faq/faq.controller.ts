import { Request, Response } from "express";
import { BaseController } from "@/core/BaseController";
import { FaqService } from "./faq.service";
import { HTTPStatusCode } from "@/types/HTTPStatusCode";

export class FaqController extends BaseController {
  constructor(private service: FaqService) {
    super();
  }

  /**
   * Create a new Faq
   */
  public create = async (req: Request, res: Response) => {
    const body = req.validatedBody;
    this.logAction("create", req, { body });

    const result = await this.service.create(body);

    return this.sendCreatedResponse(res, result, "Faq created successfully");
  };

  /**
   * Get all Faqs
   */
  public getAll = async (req: Request, res: Response) => {
    const pagination = this.extractPaginationParams(req);
    this.logAction("getAll", req, { pagination });
    const filters: any = {};

    if (req.query.type) {
      filters.type = req.query.type;
    }
    const result = await this.service.findMany(filters, pagination);

    return this.sendPaginatedResponse(
      res,
      {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
        hasNext: result.hasNext,
        hasPrevious: result.hasPrevious,
      },
      "Faqs retrieved successfully",
      result.data,
    );
  };

  /**
   * Get single Faq
   */
  public getOne = async (req: Request, res: Response) => {
    const id = req.params.id;
    this.logAction("getOne", req, { id });

    const result = await this.service.findById(id);

    if (!result) {
      return this.sendResponse(res, "Faq not found", HTTPStatusCode.NOT_FOUND);
    }

    return this.sendResponse(
      res,
      "Faq retrieved successfully",
      HTTPStatusCode.OK,
      result,
    );
  };

  /**
   * Update Faq
   */
  public update = async (req: Request, res: Response) => {
    const { id } = req.validatedParams;
    const body = req.validatedBody;
    this.logAction("update", req, { id, body });

    const exists = await this.service.exists({ id });
    if (!exists) {
      return this.sendResponse(res, "Faq not found", HTTPStatusCode.NOT_FOUND);
    }

    const result = await this.service.updateById(id, body);

    return this.sendResponse(
      res,
      "Faq updated successfully",
      HTTPStatusCode.OK,
      result,
    );
  };

  /**
   * Delete Faq
   */
  public delete = async (req: Request, res: Response) => {
    const { id } = req.validatedParams;
    this.logAction("delete", req, { id });

    const exists = await this.service.exists({ id });
    if (!exists) {
      return this.sendResponse(res, "Faq not found", HTTPStatusCode.NOT_FOUND);
    }

    await this.service.deleteById(id);

    return this.sendResponse(
      res,
      "Faq deleted successfully",
      HTTPStatusCode.OK,
    );
  };
}
