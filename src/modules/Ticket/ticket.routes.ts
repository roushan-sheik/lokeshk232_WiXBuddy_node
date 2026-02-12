import { Router, Request, Response } from 'express';
import { TicketController } from './ticket.controller';
import { TicketValidation } from './ticket.validation';
import { validateRequest } from '@/middleware/validation';
import { asyncHandler } from '@/middleware/asyncHandler';
import multer from 'multer';
import { authenticate } from '@/middleware/auth';
const upload = multer();
export class TicketRoutes {
  private router: Router;
  private controller: TicketController;

  constructor(controller: TicketController) {
    this.router = Router();
    this.controller = controller;
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    const createValidator = validateRequest({ body: TicketValidation.create });
    const updateValidator = validateRequest({
      params: TicketValidation.params.id,
      body: TicketValidation.update,
    });
    const idValidator = validateRequest({ params: TicketValidation.params.id });

    // Define Routes
    this.router.post(
      '/upload',
      authenticate,
      upload.single('ticket_file'),
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
