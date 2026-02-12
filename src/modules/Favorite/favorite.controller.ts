import { Request, Response } from "express";
import { BaseController } from "@/core/BaseController";
import { FavoriteService } from "./favorite.service";
import { HTTPStatusCode } from "@/types/HTTPStatusCode";

export class FavoriteController extends BaseController {
  constructor(private service: FavoriteService) {
    super();
  }

  /**
   * Create a new Favorite
   */
  public create = async (req: Request, res: Response) => {
    const body = req.validatedBody;
    this.logAction("create", req, { body });
    const eventId = req.params.eventId;
    this.logAction("create", req, { eventId });
    const result = await this.service.createFavorite(body, eventId, req.userId);

    return this.sendCreatedResponse(
      res,
      result,
      "Favorite created successfully",
    );
  };

  /**
   * Get all Favorites
   */
  public getAll = async (req: Request, res: Response) => {
    const pagination = this.extractPaginationParams(req);
    this.logAction("getAll", req, { pagination });
    const userId = req.userId;
    this.logAction("getAll", req, { userId });
    const result = await this.service.findMany(userId, pagination);

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
      "Favorites retrieved successfully",
      result.data,
    );
  };

  /**
   * Get single Favorite
   */
  public getOne = async (req: Request, res: Response) => {
    const { id } = req.validatedParams;
    this.logAction("getOne", req, { id });

    const result = await this.service.findById(id);

    if (!result) {
      return this.sendResponse(
        res,
        "Favorite not found",
        HTTPStatusCode.NOT_FOUND,
      );
    }

    return this.sendResponse(
      res,
      "Favorite retrieved successfully",
      HTTPStatusCode.OK,
      result,
    );
  };

  /**
   * Update Favorite
   */
  public update = async (req: Request, res: Response) => {
    const { id } = req.validatedParams;
    const body = req.validatedBody;
    this.logAction("update", req, { id, body });

    const exists = await this.service.exists({ id });
    if (!exists) {
      return this.sendResponse(
        res,
        "Favorite not found",
        HTTPStatusCode.NOT_FOUND,
      );
    }

    const result = await this.service.updateById(id, body);

    return this.sendResponse(
      res,
      "Favorite updated successfully",
      HTTPStatusCode.OK,
      result,
    );
  };

  /**
   * Delete Favorite
   */
  public delete = async (req: Request, res: Response) => {
    const { id } = req.validatedParams;
    this.logAction("delete", req, { id });

    const exists = await this.service.exists({ id });
    if (!exists) {
      return this.sendResponse(
        res,
        "Favorite not found",
        HTTPStatusCode.NOT_FOUND,
      );
    }

    await this.service.deleteById(id);

    return this.sendResponse(
      res,
      "Favorite deleted successfully",
      HTTPStatusCode.OK,
    );
  };
}
