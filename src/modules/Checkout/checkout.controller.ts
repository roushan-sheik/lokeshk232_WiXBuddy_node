import { Request, Response } from "express";
import { BaseController } from "@/core/BaseController";
import { CheckoutService } from "./checkout.service";
import { HTTPStatusCode } from "@/types/HTTPStatusCode";

export class CheckoutController extends BaseController {
  constructor(private service: CheckoutService) {
    super();
  }

  /**
   * Create a new Checkout
   */
  public create = async (req: Request, res: Response) => {
    const body = req.validatedBody;
    this.logAction("create", req, { body });

    const result = await this.service.create(body);

    return this.sendCreatedResponse(
      res,
      result,
      "Checkout created successfully",
    );
  };

  /**
   * Get all Checkouts
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
      "Checkouts retrieved successfully",
      result.data,
    );
  };
  public checkout = async (req: Request, res: Response) => {
    this.logAction("checkout", req);

    const result = await this.service.checkout(
      req.userId,
      req.body.coupon_code,
    );

    return this.sendResponse(
      res,
      "Order placed successfully",
      HTTPStatusCode.OK,
      result.data,
    );
  };
  /**
   * Get single Checkout
   */
  public getOne = async (req: Request, res: Response) => {
    const { id } = req.validatedParams;
    this.logAction("getOne", req, { id });

    const result = await this.service.findById(id);

    if (!result) {
      return this.sendResponse(
        res,
        "Checkout not found",
        HTTPStatusCode.NOT_FOUND,
      );
    }

    return this.sendResponse(
      res,
      "Checkout retrieved successfully",
      HTTPStatusCode.OK,
      result,
    );
  };

  /**
   * Update Checkout
   */
  public update = async (req: Request, res: Response) => {
    const { id } = req.validatedParams;
    const body = req.validatedBody;
    this.logAction("update", req, { id, body });

    const exists = await this.service.exists({ id });
    if (!exists) {
      return this.sendResponse(
        res,
        "Checkout not found",
        HTTPStatusCode.NOT_FOUND,
      );
    }

    const result = await this.service.updateById(id, body);

    return this.sendResponse(
      res,
      "Checkout updated successfully",
      HTTPStatusCode.OK,
      result,
    );
  };

  /**
   * Delete Checkout
   */
  public delete = async (req: Request, res: Response) => {
    const { id } = req.validatedParams;
    this.logAction("delete", req, { id });

    const exists = await this.service.exists({ id });
    if (!exists) {
      return this.sendResponse(
        res,
        "Checkout not found",
        HTTPStatusCode.NOT_FOUND,
      );
    }

    await this.service.deleteById(id);

    return this.sendResponse(
      res,
      "Checkout deleted successfully",
      HTTPStatusCode.OK,
    );
  };
}
