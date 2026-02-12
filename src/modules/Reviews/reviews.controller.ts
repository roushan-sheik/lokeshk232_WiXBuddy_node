import { Request, Response } from "express";
import { BaseController } from "@/core/BaseController";
import { ReviewsService } from "./reviews.service";
import { HTTPStatusCode } from "@/types/HTTPStatusCode";

export class ReviewsController extends BaseController {
  constructor(private service: ReviewsService) {
    super();
  }

  /**
   * Create a new Reviews
   */
  public create = async (req: Request, res: Response) => {
    const body = req.validatedBody;
    this.logAction("create", req, { body });

    const result = await this.service.create(body, req.userId);

    return this.sendCreatedResponse(
      res,
      result,
      "Reviews created successfully",
    );
  };

  /**
   * Get all Reviewss
   */
  public getAll = async (req: Request, res: Response) => {
    const pagination = this.extractPaginationParams(req);
    this.logAction("getAll", req, { pagination });

    const result = await this.service.findMany({}, pagination);

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
      "Reviewss retrieved successfully",
      result.data,
    );
  };

  /**
   * Get single Reviews
   */
  public getOne = async (req: Request, res: Response) => {
    const { id } = req.validatedParams;
    this.logAction("getOne", req, { id });

    const result = await this.service.findById(id);

    if (!result) {
      return this.sendResponse(
        res,
        "Reviews not found",
        HTTPStatusCode.NOT_FOUND,
      );
    }

    return this.sendResponse(
      res,
      "Reviews retrieved successfully",
      HTTPStatusCode.OK,
      result,
    );
  };

  /**
   * Update Reviews
   */
  public update = async (req: Request, res: Response) => {
    const { id } = req.validatedParams;
    const body = req.validatedBody;
    this.logAction("update", req, { id, body });

    const exists = await this.service.exists({ id });
    if (!exists) {
      return this.sendResponse(
        res,
        "Reviews not found",
        HTTPStatusCode.NOT_FOUND,
      );
    }

    const result = await this.service.updateById(id, body);

    return this.sendResponse(
      res,
      "Reviews updated successfully",
      HTTPStatusCode.OK,
      result,
    );
  };

  /**
   * Delete Reviews
   */
  public delete = async (req: Request, res: Response) => {
    const { id } = req.validatedParams;
    this.logAction("delete", req, { id });

    const exists = await this.service.exists({ id });
    if (!exists) {
      return this.sendResponse(
        res,
        "Reviews not found",
        HTTPStatusCode.NOT_FOUND,
      );
    }

    await this.service.deleteById(id);

    return this.sendResponse(
      res,
      "Reviews deleted successfully",
      HTTPStatusCode.OK,
    );
  };
}
