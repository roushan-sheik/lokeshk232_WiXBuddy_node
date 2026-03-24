import { Router, Request, Response } from 'express';
import { CartController } from './cart.controller';
import { CartValidation } from './cart.validation';
import { validateRequest } from '@/middleware/validation';
import { asyncHandler } from '@/middleware/asyncHandler';
import { authenticate } from '@/middleware/auth';
import multer from 'multer';
const upload = multer();
export class CartRoutes {
  private router: Router;
  private controller: CartController;

  constructor(controller: CartController) {
    this.router = Router();
    this.controller = controller;
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    const createValidator = validateRequest({ body: CartValidation.create });
    const updateValidator = validateRequest({
      params: CartValidation.params.id,
      body: CartValidation.update,
    });
    const idValidator = validateRequest({ params: CartValidation.params.id });

    // Define Routes
    this.router.post(
      '/add',
      authenticate,
      upload.none(),
      createValidator,
      asyncHandler((req, res) => this.controller.create(req, res))
    );
    this.router.get(
      '/',
      asyncHandler((req, res) => this.controller.getAll(req, res))
    );
    this.router.get(
      '/:id',
      idValidator,
      asyncHandler((req, res) => this.controller.getOne(req, res))
    );
    this.router.patch(
      '/:id',
      updateValidator,
      asyncHandler((req, res) => this.controller.update(req, res))
    );
    this.router.delete(
      '/:id',
      idValidator,
      asyncHandler((req, res) => this.controller.delete(req, res))
    );
  }

  public getRouter(): Router {
    return this.router;
  }
}
