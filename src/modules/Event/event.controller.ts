import { Request, Response } from 'express';
import { BaseController } from '@/core/BaseController';
import { EventService } from './event.service';
import { HTTPStatusCode } from '@/types/HTTPStatusCode';

export class EventController extends BaseController {
  constructor(private eventService: EventService) {
    super();
  }

  /**
   * Create a new Event
   */
  public create = async (req: Request, res: Response) => {
    const body = req.validatedBody;
    this.logAction('create', req, { body });

    const result = await this.eventService.create(body);

    return this.sendCreatedResponse(res, result, 'Event created successfully');
  };

  /**
   * Get all Events
   */
  public getAll = async (req: Request, res: Response) => {
    const pagination = this.extractPaginationParams(req);
    this.logAction('getAll', req, { pagination });
    const result = await this.eventService.fetchTicketmasterEvents(req, res);
  };

  /**
   * Get all Events By Group
   */
  public getByGroup = async (req: Request, res: Response) => {
    const pagination = this.extractPaginationParams(req);
    this.logAction('getByGroup', req, { pagination });
    const result = await this.eventService.getByGroup(req, res);
  };

  /**
   * Get all Events By Group genre
   */
  public getByGenre = async (req: Request, res: Response) => {
    const pagination = this.extractPaginationParams(req);

    this.logAction('getByGenre', req, { pagination });
    const result = await this.eventService.getByGenre(req, res);
  };

  /**
   * Get all Events By search
   */
  public getSearchEvents = async (req: Request, res: Response) => {
    const pagination = this.extractPaginationParams(req);

    this.logAction('getSearchEvents', req, { pagination });
    const result = await this.eventService.getSearchEvents(req, res);
  };
  /**
   * Get all Events Venue Best
   */
  public getEventVenuesBest = async (req: Request, res: Response) => {
    const pagination = this.extractPaginationParams(req);

    this.logAction('getEventVenuesBest', req, { pagination });
    const result = await this.eventService.getEventVenuesBest(req, res);
  };

  /**
   * Get all Events trending nearby
   */
  public getEventTrendingNearby = async (req: Request, res: Response) => {
    const pagination = this.extractPaginationParams(req);

    this.logAction('getEventTrendingNearby', req, { pagination });
    const result = await this.eventService.getEventTrendingNearby(req, res);
  };

  /**
   * Get all Events sports In Area
   */
  public getEventSportsInArea = async (req: Request, res: Response) => {
    const pagination = this.extractPaginationParams(req);

    this.logAction('getEventSportsInArea', req, { pagination });
    const result = await this.eventService.getEventSportsInArea(req, res);
  };

  /**
   * Get all Events concerts
   */
  public getEventConcerts = async (req: Request, res: Response) => {
    const pagination = this.extractPaginationParams(req);

    this.logAction('getEventConcerts', req, { pagination });
    const result = await this.eventService.getEventConcerts(req, res);
  };

  /**
   * Get all Events popular
   */
  public getEventPopular = async (req: Request, res: Response) => {
    const pagination = this.extractPaginationParams(req);

    this.logAction('getEventPopular', req, { pagination });
    const result = await this.eventService.getEventPopular(req, res);
  };

  /**
   * Get all Events Tickets
   */
  public getEventTickets = async (req: Request, res: Response) => {
    const pagination = this.extractPaginationParams(req);

    this.logAction('getEventTickets', req, { pagination });
    const result = await this.eventService.getEventTickets(req, res);
  };

  /**
   * Get all Events Tickets
   */
  public getSimilarEvent = async (req: Request, res: Response) => {
    const pagination = this.extractPaginationParams(req);

    this.logAction('getSimilarEvent', req, { pagination });
    const result = await this.eventService.getSimilarEvent(req, res);
  };

  /**
   * Get all Events cities search
   */
  public getCitiesSearch = async (req: Request, res: Response) => {
    const pagination = this.extractPaginationParams(req);

    this.logAction('getCitiesSearch', req, { pagination });
    const result = await this.eventService.getCitiesSearch(req, res);
  };

  /**
   * Get all Events Tickets By Type
   */
  public getTicketsByType = async (req: Request, res: Response) => {
    const pagination = this.extractPaginationParams(req);

    this.logAction('getTicketsByType', req, { pagination });
    const result = await this.eventService.getTicketsByType(req, res);
  };

  /**
   * Update Event
   */
  public update = async (req: Request, res: Response) => {
    const { id } = req.validatedParams;
    const body = req.validatedBody;
    this.logAction('update', req, { id, body });

    const exists = await this.eventService.exists({ id });
    if (!exists) {
      return this.sendResponse(res, 'Event not found', HTTPStatusCode.NOT_FOUND);
    }

    const result = await this.eventService.updateById(id, body);

    return this.sendResponse(res, 'Event updated successfully', HTTPStatusCode.OK, result);
  };

  /**
   * Delete Event
   */
  public delete = async (req: Request, res: Response) => {
    const { id } = req.validatedParams;
    this.logAction('delete', req, { id });

    const exists = await this.eventService.exists({ id });
    if (!exists) {
      return this.sendResponse(res, 'Event not found', HTTPStatusCode.NOT_FOUND);
    }

    await this.eventService.deleteById(id);

    return this.sendResponse(res, 'Event deleted successfully', HTTPStatusCode.OK);
  };
}
