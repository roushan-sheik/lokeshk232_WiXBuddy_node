import { Router, Request, Response } from 'express';
import { EventController } from './event.controller';
import { EventValidation } from './event.validation';
import { validateRequest } from '@/middleware/validation';
import { asyncHandler } from '@/middleware/asyncHandler';

export class EventRoutes {
  private router: Router;
  private controller: EventController;

  constructor(controller: EventController) {
    this.router = Router();
    this.controller = controller;
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    const createValidator = validateRequest({ body: EventValidation.create });
    const updateValidator = validateRequest({
      params: EventValidation.params.id,
      body: EventValidation.update,
    });
    const idValidator = validateRequest({ params: EventValidation.params.id });

    // Define Routes
    this.router.post(
      '/',
      createValidator,
      asyncHandler((req, res) => this.controller.create(req, res))
    );
    this.router.get(
      '/',
      asyncHandler((req, res) => this.controller.getAll(req, res))
    );
    this.router.get(
      '/by-groupe',
      asyncHandler((req, res) => this.controller.getByGroup(req, res))
    );

    this.router.get(
      '/search-events',
      asyncHandler((req, res) => this.controller.getSearchEvents(req, res))
    );

    this.router.get(
      '/venues/best',
      asyncHandler((req, res) => this.controller.getEventVenuesBest(req, res))
    );

    this.router.get(
      '/trending-nearby',
      asyncHandler((req, res) => this.controller.getEventTrendingNearby(req, res))
    );

    this.router.get(
      '/sports-in-area',
      asyncHandler((req, res) => this.controller.getEventSportsInArea(req, res))
    );

    this.router.get(
      '/concerts',
      asyncHandler((req, res) => this.controller.getEventConcerts(req, res))
    );

    this.router.get(
      '/popular',
      asyncHandler((req, res) => this.controller.getEventPopular(req, res))
    );

    this.router.get(
      '/cities/search',
      asyncHandler((req, res) => this.controller.getCitiesSearch(req, res))
    );

    this.router.get(
      '/tickets/:eventId',
      asyncHandler((req, res) => this.controller.getEventTickets(req, res))
    );

    this.router.get(
      '/by-genre/:genre',

      asyncHandler((req, res) => this.controller.getByGenre(req, res))
    );

    this.router.get(
      '/:eventId/similar',
      asyncHandler((req, res) => this.controller.getSimilarEvent(req, res))
    );

    this.router.get(
      '/:eventId/tickets/:ticketType',
      asyncHandler((req, res) => this.controller.getTicketsByType(req, res))
    );
  }

  public getRouter(): Router {
    return this.router;
  }
}
