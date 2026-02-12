import { Request, Response } from "express";
import { BaseController } from "@/core/BaseController";
import { CartService } from "./cart.service";
import { HTTPStatusCode } from "@/types/HTTPStatusCode";

export class CartController extends BaseController {
  constructor(private service: CartService) {
    super();
  }

  /**
   * Create a new Cart
   */
  public create = async (req: Request, res: Response) => {
    const body = req.validatedBody;
    this.logAction("create", req, { body });
    console.log({ body });
    const result = await this.service.create(body, req.userId);

    return this.sendCreatedResponse(res, result, "Cart created successfully");
  };

  /**
   * Get all Carts
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
      "Carts retrieved successfully",
      result.data,
    );
  };

  /**
   * Get single Cart
   */
  public getOne = async (req: Request, res: Response) => {
    const { id } = req.validatedParams;
    this.logAction("getOne", req, { id });

    const result = await this.service.findById(id);

    if (!result) {
      return this.sendResponse(res, "Cart not found", HTTPStatusCode.NOT_FOUND);
    }

    return this.sendResponse(
      res,
      "Cart retrieved successfully",
      HTTPStatusCode.OK,
      result,
    );
  };

  /**
   * Update Cart
   */
  public update = async (req: Request, res: Response) => {
    const { id } = req.validatedParams;
    const body = req.validatedBody;
    this.logAction("update", req, { id, body });

    const exists = await this.service.exists({ id });
    if (!exists) {
      return this.sendResponse(res, "Cart not found", HTTPStatusCode.NOT_FOUND);
    }

    const result = await this.service.updateById(id, body);

    return this.sendResponse(
      res,
      "Cart updated successfully",
      HTTPStatusCode.OK,
      result,
    );
  };

  /**
   * Delete Cart
   */
  public delete = async (req: Request, res: Response) => {
    const { id } = req.validatedParams;
    this.logAction("delete", req, { id });

    const exists = await this.service.exists({ id });
    if (!exists) {
      return this.sendResponse(res, "Cart not found", HTTPStatusCode.NOT_FOUND);
    }

    await this.service.deleteById(id);

    return this.sendResponse(
      res,
      "Cart deleted successfully",
      HTTPStatusCode.OK,
    );
  };
}
