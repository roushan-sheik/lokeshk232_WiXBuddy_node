import { Router, Request, Response } from "express";
import { ContactController } from "./contact.controller";
import { ContactValidation } from "./contact.validation";
import { validateRequest } from "@/middleware/validation";
import { asyncHandler } from "@/middleware/asyncHandler";
import multer from "multer";
const upload = multer();
export class ContactRoutes {
  private router: Router;
  private controller: ContactController;

  constructor(controller: ContactController) {
    this.router = Router();
    this.controller = controller;
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    const createValidator = validateRequest({ body: ContactValidation.create });
    const updateValidator = validateRequest({
      params: ContactValidation.params.id,
      body: ContactValidation.update,
    });
    const idValidator = validateRequest({
      params: ContactValidation.params.id,
    });

    // Define Routes
    this.router.post(
      "/send/",
      upload.none(),
      createValidator,
      asyncHandler((req, res) => this.controller.create(req, res)),
    );
  }

  public getRouter(): Router {
    return this.router;
  }
}
