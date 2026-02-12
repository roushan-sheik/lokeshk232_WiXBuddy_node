import { Router, Request, Response } from "express";
import { FaqController } from "./faq.controller";
import { FaqValidation } from "./faq.validation";
import { validateRequest } from "@/middleware/validation";
import { asyncHandler } from "@/middleware/asyncHandler";
import multer from "multer";
const upload = multer();
export class FaqRoutes {
  private router: Router;
  private controller: FaqController;

  constructor(controller: FaqController) {
    this.router = Router();
    this.controller = controller;
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    const createValidator = validateRequest({ body: FaqValidation.create });
    const updateValidator = validateRequest({
      params: FaqValidation.params.id,
      body: FaqValidation.update,
    });
    const idValidator = validateRequest({ params: FaqValidation.params.id });

    // Define Routes
    this.router.post(
      "/",
      upload.none(),
      createValidator,
      asyncHandler((req, res) => this.controller.create(req, res)),
    );
    this.router.get(
      "/question",
      asyncHandler((req, res) => this.controller.getAll(req, res)),
    );
    this.router.get(
      "/answer/:id",
      //   idValidator,
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
