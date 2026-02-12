import { Request, Response } from "express";
import { BaseController } from "@/core/BaseController";
import { MagazineService } from "./magazine.service";
import { HTTPStatusCode } from "@/types/HTTPStatusCode";

export class MagazineController extends BaseController {
  constructor(private service: MagazineService) {
    super();
  }

  /**
   * Get all Magazines
   */
  public getEvents = async (req: Request, res: Response) => {
    const pagination = this.extractPaginationParams(req);
    this.logAction("getAll", req, { pagination });

    const result = await this.service.getEvents({}, pagination);
    if (!result.status) {
      return this.sendResponse(
        res,
        result.message || "Failed to retrieve events",
        HTTPStatusCode.INTERNAL_SERVER_ERROR,
      );
    }

    return this.sendResponse(
      res,
      "Events retrieved successfully",
      HTTPStatusCode.OK,
      result,
    );
  };

  /**
   * Get single Magazine
   */
  public getEventDetails = async (req: Request, res: Response) => {
    // const { id } = req.validatedParams;
    const id = req.params.id;
    this.logAction("getOne", req, { id });

    const result = await this.service.getEventDetails(id);

    if (!result.status) {
      return this.sendResponse(
        res,
        result.message || "Event not found",
        HTTPStatusCode.NOT_FOUND,
      );
    }

    return this.sendResponse(
      res,
      "Event retrieved successfully",
      HTTPStatusCode.OK,
      result,
    );
  };
  public getEventsByTag = async (req: Request, res: Response) => {
    const tag = req.params.tag;
    this.logAction("getEventsByTag", req, { tag });

    const result = await this.service.getEventsByTag(tag);

    if (!result.status) {
      return this.sendResponse(
        res,
        result.message || "Event not found",
        HTTPStatusCode.NOT_FOUND,
      );
    }

    return this.sendResponse(
      res,
      "Event retrieved successfully",
      HTTPStatusCode.OK,
      result,
    );
  };
}
