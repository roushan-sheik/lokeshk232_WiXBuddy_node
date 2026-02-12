import { Router, Request, Response } from "express";
import { FavoriteController } from "./favorite.controller";
import { FavoriteValidation } from "./favorite.validation";
import { validateRequest } from "@/middleware/validation";
import { asyncHandler } from "@/middleware/asyncHandler";
import { authenticate } from "@/middleware/auth";
import multer from "multer";
const upload = multer();
export class FavoriteRoutes {
  private router: Router;
  private controller: FavoriteController;

  constructor(controller: FavoriteController) {
    this.router = Router();
    this.controller = controller;
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    const createValidator = validateRequest({
      body: FavoriteValidation.create,
    });
    const updateValidator = validateRequest({
      params: FavoriteValidation.params.id,
      body: FavoriteValidation.update,
    });
    const idValidator = validateRequest({
      params: FavoriteValidation.params.id,
    });

    // Define Routes
    this.router.post(
      "/calendar/add/:eventId",
      upload.none(),
      authenticate,
      createValidator,
      asyncHandler((req, res) => this.controller.create(req, res)),
    );

    this.router.get(
      "/calendar",
      authenticate,
      asyncHandler((req, res) => this.controller.getAll(req, res)),
    );
    this.router.get(
      "/:id",
      idValidator,
      asyncHandler((req, res) => this.controller.getOne(req, res)),
    );
    this.router.patch(
      "/:id",
      updateValidator,
      asyncHandler((req, res) => this.controller.update(req, res)),
    );
    this.router.delete(
      "/:id",
      idValidator,
      asyncHandler((req, res) => this.controller.delete(req, res)),
    );
  }

  public getRouter(): Router {
    return this.router;
  }
}
