import { Router, Request, Response } from "express";
import { MagazineController } from "./magazine.controller";
import { MagazineValidation } from "./magazine.validation";
import { validateRequest } from "@/middleware/validation";
import { asyncHandler } from "@/middleware/asyncHandler";

export class MagazineRoutes {
  private router: Router;
  private controller: MagazineController;

  constructor(controller: MagazineController) {
    this.router = Router();
    this.controller = controller;
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    const createValidator = validateRequest({
      body: MagazineValidation.create,
    });
    const updateValidator = validateRequest({
      params: MagazineValidation.params.id,
      body: MagazineValidation.update,
    });
    const idValidator = validateRequest({
      params: MagazineValidation.params.id,
    });

    this.router.get(
      "/",
      asyncHandler((req, res) => this.controller.getEvents(req, res)),
    );
    this.router.get(
      "/article/:id",
      asyncHandler((req, res) => this.controller.getEventDetails(req, res)),
    );
    this.router.get(
      "/tag/:tag",
      asyncHandler((req, res) => this.controller.getEventsByTag(req, res)),
    );
  }

  public getRouter(): Router {
    return this.router;
  }
}
