import { Router, Request, Response } from "express";
import { ReviewsController } from "./reviews.controller";
import { ReviewsValidation } from "./reviews.validation";
import { validateRequest } from "@/middleware/validation";
import { asyncHandler } from "@/middleware/asyncHandler";
import multer from "multer";
import { authenticate } from "@/middleware/auth";
const upload = multer();
export class ReviewsRoutes {
  private router: Router;
  private controller: ReviewsController;

  constructor(controller: ReviewsController) {
    this.router = Router();
    this.controller = controller;
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    const createValidator = validateRequest({ body: ReviewsValidation.create });
    const updateValidator = validateRequest({
      params: ReviewsValidation.params.id,
      body: ReviewsValidation.update,
    });
    const idValidator = validateRequest({
      params: ReviewsValidation.params.id,
    });

    // Define Routes
    this.router.post(
      "/store",
      authenticate,
      upload.none(),
      createValidator,
      asyncHandler((req, res) => this.controller.create(req, res)),
    );
    this.router.get(
      "/",
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
