import { BaseService } from '@/core/BaseService';
import { PrismaClient } from '@/generated/prisma/client';
import { PaginationOptions } from '@/types/types';
import { CreateEventInput, UpdateEventInput } from './event.validation';
import axios from 'axios';
import dayjs, { Dayjs } from 'dayjs';
import config from '@/core/config';
import { Request } from 'express';
import { FindManyQuery, FindManyResponse, TicketmasterEvent } from './event.type';
import { any } from 'zod';
export class EventService extends BaseService<any, CreateEventInput, UpdateEventInput> {
  constructor(prisma: PrismaClient) {
    super(prisma, 'Event', {
      enableSoftDelete: true,
      enableAuditFields: true,
    });
  }

  protected getModel() {
    // @ts-ignore - The model 'event' might not exist in PrismaClient types yet
    return this.prisma.event;
  }

  // =========================================================================
  // Public API - Exposing BaseService methods
  // Since BaseService methods are protected, we must expose them here
  // =========================================================================

  public async create(data: CreateEventInput, include?: any) {
    return super.create(data, include);
  }

  public async fetchTicketmasterEvents(
    req: Request<{}, {}, {}, FindManyQuery>,
    res: any
  ): Promise<FindManyResponse> {
    try {
      const {
        period = 'today',
        location,
        venue,
        from,
        to,
        query = '',
        filter,
        page = 0,
        size = 20,
        lat,
        lng,
        radius = 50,
        genre,
      } = req.query;

      let start: Dayjs;
      let end: Dayjs;
      const now = dayjs();

      /* ---------- Period handling ---------- */
      switch (period) {
        case 'today':
          start = now.startOf('day');
          end = now.endOf('day');
          break;
        case 'tomorrow':
          start = now.add(1, 'day').startOf('day');
          end = now.add(1, 'day').endOf('day');
          break;
        case 'this-week':
          start = now.startOf('week');
          end = now.endOf('week');
          break;
        case 'next-week':
          start = now.add(1, 'week').startOf('week');
          end = now.add(1, 'week').endOf('week');
          break;
        case 'this-month':
          start = now.startOf('month');
          end = now.endOf('month');
          break;
        case 'custom':
          if (!from || !to) {
            return { status: false, message: 'From and To dates are required' };
          }
          start = dayjs(from).startOf('day');
          end = dayjs(to).endOf('day');
          break;
        default:
          return { status: false, message: 'Invalid period' };
      }

      /* ---------- Ticketmaster params ---------- */
      const params: Record<string, any> = {
        apikey: config.ticketmaster.ticket_master_api_key,
        size,
        page,
        startDateTime: start.toISOString().replace(/\.\d{3}Z$/, 'Z'),
        endDateTime: end.toISOString().replace(/\.\d{3}Z$/, 'Z'),
      };

      /* ---------- Search / filter ---------- */
      if (query) {
        if (filter === 'city') params.city = query;
        else if (filter === 'genre') params.classificationName = query;
        else params.keyword = query;
      }

      if (location && location !== 'anywhere') {
        params.city = location;
      }

      if (lat && lng) {
        params.latlong = `${lat},${lng}`;
        params.radius = radius;
        params.unit = 'miles';
      }

      if (genre) {
        params.classificationName = Array.isArray(genre) ? genre.join(',') : genre;
      }

      /* ---------- Venue search ---------- */
      if (venue) {
        const venueRes = await axios.get(`${config.ticketmaster.ticket_master_venues_url}`, {
          params: {
            apikey: config.ticketmaster.ticket_master_api_key,
            keyword: venue,
            size: 1,
          },
        });
        console.log({ venueRes });
        const venueId: string | null = venueRes.data?._embedded?.venues?.[0]?.id ?? null;
        if (venueId) params.venueId = venueId;
      }

      const { apikey, ...restParams } = params;

      /* ---------- Fetch events ---------- */
      const response = await axios.get(
        `${config.ticketmaster.ticket_master_events_url}?apikey=${config.ticketmaster.ticket_master_api_key}`,
        { params: restParams }
      );
      console.log('event response', response.data);
      const events: TicketmasterEvent[] = response.data?._embedded?.events ?? [];
      const pageInfo = response.data?.page ?? {};
      console.log('event response', response.data);
      /* ---------- Fetch all resale tickets at once to avoid N+1 ---------- */
      const eventIds = events.map(e => e.id);
      console.log({ eventIds });
      const allTickets = await this.prisma.resaleTicket.findMany({
        where: {
          event_id: { in: eventIds },
          status: 'approved',
        },
      });

      const ticketsByEvent: Record<string, typeof allTickets> = {};
      allTickets.forEach(t => {
        if (t.event_id !== null) {
          if (!ticketsByEvent[t.event_id]) ticketsByEvent[t.event_id] = [];
          ticketsByEvent[t.event_id].push(t);
        }
      });
      console.log('events', events);
      /* ---------- Map events ---------- */
      const mapped = events.map(event => {
        console.log('inside map');
        const tickets = ticketsByEvent[event.id] ?? [];
        const totalQuantity = tickets.reduce((sum, t) => sum + (t.quantity ?? 0), 0);
        const totalReserved = tickets.reduce((sum, t) => sum + (t.reserved_quantity ?? 0), 0);
        const totalSold = tickets.reduce((sum, t) => sum + (t.sold_quantity ?? 0), 0);

        const venueObj = event._embedded?.venues?.[0];
        const lat = venueObj?.location?.latitude ?? null;
        const lng = venueObj?.location?.longitude ?? null;

        return {
          id: event.id,
          title: event.name,
          image: event.images?.[0]?.url ?? null,
          short_description: (event.info || event.pleaseNote || '').slice(0, 100),
          start_date: event.dates?.start?.localDate ?? null,
          end_date: event.dates?.end?.localDate ?? event.dates?.start?.localDate ?? null,
          time: event.dates?.start?.localTime ?? null,
          venue: venueObj?.name ?? null,
          location: venueObj?.city?.name ?? null,
          latitude: lat,
          longitude: lng,
          available_quantity: Math.max(0, totalQuantity - totalReserved - totalSold),
          ticket_url: event.url ?? null,
        };
      });

      return res.status(200).json({ status: true, pagination: pageInfo, data: mapped });
    } catch (error: any) {
      console.error('FetchTicketmasterEvents Error:', error);
      return {
        status: false,
        message: 'Failed to fetch events',
      };
    }
  }

  public async getByGroup(req: Request, res: any): Promise<any> {
    try {
      /* ---------- Ticketmaster params ---------- */
      const params = {
        apikey: config.ticketmaster.ticket_master_api_key,
        size: 100,
        classificationName: 'Sports',
      };

      /* ---------- Fetch events ---------- */
      const response = await axios.get(`${config.ticketmaster.ticket_master_events_url}`, {
        params,
      });

      const events = response.data?._embedded?.events ?? [];

      /* ---------- Format events ---------- */
      const formattedEvents = events.map((event: any) => ({
        id: event.id,
        title: event.name,
        image: event.images?.[0]?.url ?? null,
        genres: event.classifications?.map((c: any) => c.genre?.name).filter(Boolean) ?? [],
        segment: event.classifications?.map((c: any) => c.segment?.name).filter(Boolean) ?? [],
      }));

      /* ---------- Group by genre ---------- */
      const grouped: Record<string, any[]> = {};

      for (const event of formattedEvents) {
        if (!event.genres.length) {
          if (!grouped['Other']) grouped['Other'] = [];
          grouped['Other'].push(event);
        } else {
          for (const genre of event.genres) {
            if (!grouped[genre]) grouped[genre] = [];
            grouped[genre].push(event);
          }
        }
      }
      /* ---------- Response ---------- */
      return res.status(200).json({
        status: true,
        data: grouped,
      });
    } catch (error: any) {
      console.error('GetByGroup Error:', error);
      return res.status(500).json({
        status: false,
        message: 'Failed to fetch grouped events',
      });
    }
  }

  public async getByGenre(req: Request, res: any): Promise<any> {
    try {
      const { genre } = req.params;
      const page = Number(req.query.page ?? 0);
      const size = 50;

      /* ---------- Ticketmaster params ---------- */
      const params = {
        apikey: config.ticketmaster.ticket_master_api_key,
        size,
        page,
      };

      /* ---------- Fetch events ---------- */
      const response = await axios.get(`${config.ticketmaster.ticket_master_events_url}`, {
        params,
      });

      const events = response.data?._embedded?.events ?? [];

      /* ---------- Fetch resale tickets (avoid N+1) ---------- */
      const eventIds = events.map((e: any) => e.id);

      const resaleTickets = await this.prisma.resaleTicket.findMany({
        where: {
          event_id: { in: eventIds },
          status: 'approved',
        },
      });

      const ticketsByEvent: Record<string, typeof resaleTickets> = {};
      resaleTickets.forEach(ticket => {
        if (!ticket.event_id) return;
        if (!ticketsByEvent[ticket.event_id]) {
          ticketsByEvent[ticket.event_id] = [];
        }
        ticketsByEvent[ticket.event_id].push(ticket);
      });

      /* ---------- Format events ---------- */
      const formattedEvents = events.map((event: any) => {
        const tickets = ticketsByEvent[event.id] ?? [];

        const totalQuantity = tickets.reduce((sum, t) => sum + (t.quantity ?? 0), 0);
        const totalReserved = tickets.reduce((sum, t) => sum + (t.reserved_quantity ?? 0), 0);
        const totalSold = tickets.reduce((sum, t) => sum + (t.sold_quantity ?? 0), 0);

        const availableQuantity = Math.max(0, totalQuantity - totalReserved - totalSold);

        const venue = event._embedded?.venues?.[0];
        const lat = venue?.location?.latitude ?? null;
        const lng = venue?.location?.longitude ?? null;

        const genres = event.classifications?.map((c: any) => c.genre?.name).filter(Boolean) ?? [];

        return {
          id: event.id,
          title: event.name,
          image: event.images?.[0]?.url ?? null,
          short_description: (event.info || event.pleaseNote || '').slice(0, 100),
          start_date: event.dates?.start?.localDate ?? null,
          end_date: event.dates?.end?.localDate ?? event.dates?.start?.localDate ?? null,
          time: event.dates?.start?.localTime ?? null,
          venue: venue?.name ?? null,
          genres,
          segment: event.classifications?.map((c: any) => c.segment?.name).filter(Boolean) ?? [],
          location: venue?.city?.name ?? null,
          latitude: lat,
          longitude: lng,
          available_quantity: availableQuantity,
          ticket_url: event.url ?? null,
        };
      });

      /* ---------- Filter by genre ---------- */
      const filteredEvents = formattedEvents.filter((event: any) => event.genres.includes(genre));

      /* ---------- Response ---------- */
      return res.status(200).json({
        status: true,
        genre,
        pagination: response.data?.page ?? {},
        data: filteredEvents,
      });
    } catch (error: any) {
      console.error('GetByGenre Error:', error);
      return res.status(500).json({
        status: false,
        message: 'Failed to fetch events by genre',
      });
    }
  }

  public async getSearchEvents(req: Request, res: any): Promise<any> {
    try {
      const keyword = String(req.query.keyword ?? '').trim();

      /* ---------- Ticketmaster params ---------- */
      const params = {
        apikey: config.ticketmaster.ticket_master_api_key,
        keyword,
        size: 50,
      };

      /* ---------- Fetch events ---------- */
      const response = await axios.get(`${config.ticketmaster.ticket_master_events_url}`, {
        params,
      });

      const events = response.data?._embedded?.events ?? [];

      /* ---------- Map events ---------- */
      const mappedEvents = events.map((event: any) => {
        const venue = event._embedded?.venues?.[0];
        const lat = venue?.location?.latitude ?? null;
        const lng = venue?.location?.longitude ?? null;

        return {
          id: event.id,
          title: event.name,
          start_date: event.dates?.start?.localDate ?? null,
          end_date: event.dates?.end?.localDate ?? event.dates?.start?.localDate ?? null,
          time: event.dates?.start?.localTime ?? null,
          image: event.images?.[0]?.url ?? null,
          venue: venue?.name ?? null,
          location: venue?.city?.name ?? null,
          latitude: lat,
          longitude: lng,
          ticket_url: event.url ?? null,
        };
      });

      /* ---------- Response ---------- */
      return res.status(200).json({
        status: true,
        data: mappedEvents,
      });
    } catch (error: any) {
      console.error('GetSearchEvents Error:', error);
      return res.status(500).json({
        status: false,
        message: 'Failed to search events',
      });
    }
  }

  public async getEventVenuesBest(req: Request, res: any): Promise<any> {
    try {
      const countryCode = String(req.query.countryCode ?? '').trim();

      /* ---------- Ticketmaster params ---------- */
      const params = {
        apikey: config.ticketmaster.ticket_master_api_key,
        size: 20,
        page: 0,
        sort: 'name,asc',
        countryCode: countryCode || undefined,
      };

      /* ---------- Fetch venues ---------- */
      const response = await axios.get(`${config.ticketmaster.ticket_master_venues_url}`, {
        params,
      });

      const venues = response.data?._embedded?.venues ?? [];

      /* ---------- Response ---------- */
      return res.status(200).json({
        status: true,
        message: 'Top venues fetched successfully',
        data: venues,
      });
    } catch (error: any) {
      console.error('GetEventVenuesBest Error:', error);
      return res.status(500).json({
        status: false,
        message: 'Failed to fetch venues',
        data: [],
      });
    }
  }

  public async getEventTrendingNearby(req: Request, res: any): Promise<any> {
    try {
      const lat = req.query.lat ?? req.body?.lat;
      const lng = req.query.lng ?? req.body?.lng;
      const radius = Number(req.query.radius ?? req.body?.radius ?? 100);

      /* ---------- Validation ---------- */
      if (!lat || !lng) {
        return res.status(422).json({
          status: false,
          message: 'Latitude and longitude are required',
        });
      }

      /* ---------- Ticketmaster params ---------- */
      const params = {
        apikey: config.ticketmaster.ticket_master_api_key,
        latlong: `${lat},${lng}`,
        radius,
        size: 20,
      };

      /* ---------- Fetch events ---------- */
      const response = await axios.get(`${config.ticketmaster.ticket_master_events_url}`, {
        params,
      });

      const events = response.data?._embedded?.events ?? [];

      /* ---------- Map events ---------- */
      const mappedEvents = events.map((event: any) => {
        const venue = event._embedded?.venues?.[0];
        const eventLat = venue?.location?.latitude ?? null;
        const eventLng = venue?.location?.longitude ?? null;

        return {
          id: event.id,
          title: event.name,
          date: event.dates?.start?.localDate ?? null,
          time: event.dates?.start?.localTime ?? null,
          image: event.images?.[0]?.url ?? null,
          venue: venue?.name ?? null,
          location: venue?.city?.name ?? null,
          latitude: eventLat,
          longitude: eventLng,
          ticket_url: event.url ?? null,
        };
      });

      /* ---------- Response ---------- */
      return res.status(200).json({
        status: true,
        data: mappedEvents,
      });
    } catch (error: any) {
      console.error('GetEventTrendingNearby Error:', error);
      return res.status(500).json({
        status: false,
        message: 'Failed to fetch trending nearby events',
      });
    }
  }

  public async getEventSportsInArea(req: Request, res: any): Promise<any> {
    try {
      const lat = req.query.lat ?? req.body?.lat;
      const lng = req.query.lng ?? req.body?.lng;
      const radius = Number(req.query.radius ?? req.body?.radius ?? 100);
      const page = Number(req.query.page ?? 0);
      const size = 10;

      /* ---------- Validation ---------- */
      if (!lat || !lng) {
        return res.status(422).json({
          status: false,
          message: 'Latitude and longitude are required',
        });
      }

      /* ---------- Ticketmaster params ---------- */
      const params = {
        apikey: config.ticketmaster.ticket_master_api_key,
        latlong: `${lat},${lng}`,
        radius,
        size,
        page,
        classificationName: 'Sports',
      };

      /* ---------- Fetch events ---------- */
      const response = await axios.get(`${config.ticketmaster.ticket_master_events_url}`, {
        params,
      });

      const events = response.data?._embedded?.events ?? [];
      const pageInfo = response.data?.page ?? {};

      /* ---------- Fetch resale tickets (avoid N+1) ---------- */
      const eventIds = events.map((e: any) => e.id);

      const resaleTickets = await this.prisma.resaleTicket.findMany({
        where: {
          event_id: { in: eventIds },
          status: 'approved',
        },
      });

      const ticketsByEvent: Record<string, typeof resaleTickets> = {};
      resaleTickets.forEach(ticket => {
        if (!ticket.event_id) return;
        if (!ticketsByEvent[ticket.event_id]) {
          ticketsByEvent[ticket.event_id] = [];
        }
        ticketsByEvent[ticket.event_id].push(ticket);
      });

      /* ---------- Map events ---------- */
      const mappedEvents = events.map((event: any) => {
        const tickets = ticketsByEvent[event.id] ?? [];

        const totalQuantity = tickets.reduce((sum, t) => sum + (t.quantity ?? 0), 0);
        const totalReserved = tickets.reduce((sum, t) => sum + (t.reserved_quantity ?? 0), 0);
        const totalSold = tickets.reduce((sum, t) => sum + (t.sold_quantity ?? 0), 0);

        const availableQuantity = Math.max(0, totalQuantity - totalReserved - totalSold);

        const venue = event._embedded?.venues?.[0];
        const eventLat = venue?.location?.latitude ?? null;
        const eventLng = venue?.location?.longitude ?? null;

        return {
          id: event.id,
          title: event.name,
          date: event.dates?.start?.localDate ?? null,
          time: event.dates?.start?.localTime ?? null,
          image: event.images?.[0]?.url ?? null,
          venue: venue?.name ?? null,
          location: venue?.city?.name ?? null,
          latitude: eventLat,
          longitude: eventLng,
          available_quantity: availableQuantity,
        };
      });

      /* ---------- Response ---------- */
      return res.status(200).json({
        status: true,
        pagination: pageInfo,
        data: mappedEvents,
      });
    } catch (error: any) {
      console.error('GetEventSportsInArea Error:', error);
      return res.status(500).json({
        status: false,
        message: 'Failed to fetch sports events in area',
      });
    }
  }

  public async getEventConcerts(req: Request, res: any): Promise<any> {
    try {
      const lat = req.query.lat ?? req.body?.lat;
      const lng = req.query.lng ?? req.body?.lng;
      const radius = Number(req.query.radius ?? req.body?.radius ?? 100);
      const page = Number(req.query.page ?? 0);
      const size = 10;

      /* ---------- Validation ---------- */
      if (!lat || !lng) {
        return res.status(422).json({
          status: false,
          message: 'Latitude and longitude are required',
        });
      }

      /* ---------- Ticketmaster params ---------- */
      const params = {
        apikey: config.ticketmaster.ticket_master_api_key,
        latlong: `${lat},${lng}`,
        radius,
        size,
        page,
        keyword: 'concerts',
      };

      /* ---------- Fetch events ---------- */
      const response = await axios.get(`${config.ticketmaster.ticket_master_events_url}`, {
        params,
      });

      const events = response.data?._embedded?.events ?? [];
      const pageInfo = response.data?.page ?? {};

      /* ---------- Fetch resale tickets (avoid N+1) ---------- */
      const eventIds = events.map((e: any) => e.id);

      const resaleTickets = await this.prisma.resaleTicket.findMany({
        where: {
          event_id: { in: eventIds },
          status: 'approved',
        },
      });

      const ticketsByEvent: Record<string, typeof resaleTickets> = {};
      resaleTickets.forEach(ticket => {
        if (!ticket.event_id) return;
        if (!ticketsByEvent[ticket.event_id]) {
          ticketsByEvent[ticket.event_id] = [];
        }
        ticketsByEvent[ticket.event_id].push(ticket);
      });

      /* ---------- Map events ---------- */
      const mappedEvents = events.map((event: any) => {
        const tickets = ticketsByEvent[event.id] ?? [];

        const totalQuantity = tickets.reduce((sum, t) => sum + (t.quantity ?? 0), 0);
        const totalReserved = tickets.reduce((sum, t) => sum + (t.reserved_quantity ?? 0), 0);
        const totalSold = tickets.reduce((sum, t) => sum + (t.sold_quantity ?? 0), 0);

        const availableQuantity = Math.max(0, totalQuantity - totalReserved - totalSold);

        const venue = event._embedded?.venues?.[0];
        const eventLat = venue?.location?.latitude ?? null;
        const eventLng = venue?.location?.longitude ?? null;

        return {
          id: event.id,
          title: event.name,
          date: event.dates?.start?.localDate ?? null,
          time: event.dates?.start?.localTime ?? null,
          image: event.images?.[0]?.url ?? null,
          venue: venue?.name ?? null,
          location: venue?.city?.name ?? null,
          latitude: eventLat,
          longitude: eventLng,
          available_quantity: availableQuantity,
        };
      });

      /* ---------- Response ---------- */
      return res.status(200).json({
        status: true,
        pagination: pageInfo,
        data: mappedEvents,
      });
    } catch (error: any) {
      console.error('GetEventConcerts Error:', error);
      return res.status(500).json({
        status: false,
        message: 'Failed to fetch concerts in area',
      });
    }
  }

  public async getEventPopular(req: Request, res: any): Promise<any> {
    try {
      const lat = req.query.lat ?? req.body?.lat;
      const lng = req.query.lng ?? req.body?.lng;
      const radius = Number(req.query.radius ?? req.body?.radius ?? 100);

      /* ---------- Ticketmaster params ---------- */
      const params = {
        apikey: config.ticketmaster.ticket_master_api_key,
        latlong: `${lat},${lng}`,
        radius,
        size: 6,
        sort: 'relevance,desc',
      };

      /* ---------- Fetch events ---------- */
      const response = await axios.get(`${config.ticketmaster.ticket_master_events_url}`, {
        params,
      });

      const events = response.data?._embedded?.events ?? [];

      /* ---------- Fetch resale tickets (avoid N+1) ---------- */
      const eventIds = events.map((e: any) => e.id);

      const resaleTickets = await this.prisma.resaleTicket.findMany({
        where: {
          event_id: { in: eventIds },
          status: 'approved',
        },
      });

      const ticketsByEvent: Record<string, typeof resaleTickets> = {};
      resaleTickets.forEach(ticket => {
        if (!ticket.event_id) return;
        if (!ticketsByEvent[ticket.event_id]) {
          ticketsByEvent[ticket.event_id] = [];
        }
        ticketsByEvent[ticket.event_id].push(ticket);
      });

      /* ---------- Map events ---------- */
      const mappedEvents = events.map((event: any) => {
        const tickets = ticketsByEvent[event.id] ?? [];

        const totalQuantity = tickets.reduce((sum, t) => sum + (t.quantity ?? 0), 0);
        const totalReserved = tickets.reduce((sum, t) => sum + (t.reserved_quantity ?? 0), 0);
        const totalSold = tickets.reduce((sum, t) => sum + (t.sold_quantity ?? 0), 0);

        const availableQuantity = Math.max(0, totalQuantity - totalReserved - totalSold);

        const venue = event._embedded?.venues?.[0];
        const eventLat = venue?.location?.latitude ?? null;
        const eventLng = venue?.location?.longitude ?? null;

        return {
          id: event.id,
          title: event.name,
          image: event.images?.[0]?.url ?? null,
          date: event.dates?.start?.localDate ?? null,
          time: event.dates?.start?.localTime ?? null,
          venue: venue?.name ?? null,
          location: venue?.city?.name ?? null,
          latitude: eventLat,
          longitude: eventLng,
          available_quantity: availableQuantity,
          ticket_url: event.url ?? null,
        };
      });

      /* ---------- Response ---------- */
      return res.status(200).json({
        status: true,
        data: mappedEvents,
      });
    } catch (error: any) {
      console.error('GetEventPopular Error:', error);
      return res.status(500).json({
        status: false,
        message: 'Failed to fetch popular events',
      });
    }
  }

  public async getEventTickets(req: Request, res: any): Promise<any> {
    try {
      const eventId = req.params.eventId;
      console.log({ eventId });
      /* ---------- Fetch event from Ticketmaster ---------- */
      const eventResponse = await axios.get(
        `https://app.ticketmaster.com/discovery/v2/events/${eventId}.json?apikey=${config.ticketmaster.ticket_master_api_key}`
      );
      // console.log({ eventResponse });
      const event = eventResponse.data;

      if (!event) {
        return res.status(200).json({
          status: true,
          message: 'Failed to fetch event from Ticketmaster',
          data: [],
        });
      }

      /* ---------- Fetch resale tickets ---------- */
      const resaleTickets = await this.prisma.resaleTicket.findMany({
        where: {
          event_id: eventId,
          status: 'approved',
        },
        select: {
          id: true,
          event_id: true,
          price: true,
          ticket_type: true,
          seat_info: true,
          additional_info: true,
          start_date: true,
          end_date: true,
          time: true,
          quantity: true,
          reserved_quantity: true,
          sold_quantity: true,
        },
      });

      const venue = event._embedded?.venues?.[0];

      /* ---------- If no resale tickets ---------- */
      if (!resaleTickets.length) {
        return res.status(200).json({
          status: true,
          message: 'No resale tickets found for this event',
          data: {
            event_id: event.id,
            title: event.name ?? null,
            image: event.images?.[0]?.url ?? null,
            start_date: event.dates?.start?.localDate ?? null,
            end_date: event.dates?.end?.localDate ?? event.dates?.start?.localDate ?? null,
            time: event.dates?.start?.localTime ?? null,
            venue: venue?.name ?? null,
            location: venue?.city?.name ?? null,
            orginal_ticket_url: event.url ?? null,
          },
        });
      }

      /* ---------- Totals ---------- */
      const totalQuantity = resaleTickets.reduce((sum, t) => sum + (t.quantity ?? 0), 0);
      const totalReserved = resaleTickets.reduce((sum, t) => sum + (t.reserved_quantity ?? 0), 0);
      const totalSold = resaleTickets.reduce((sum, t) => sum + (t.sold_quantity ?? 0), 0);
      const totalAvailable = Math.max(0, totalQuantity - totalReserved - totalSold);

      /* ---------- Group by ticket type ---------- */
      const grouped: Record<string, typeof resaleTickets> = {};

      resaleTickets.forEach(ticket => {
        const type = (ticket.ticket_type ?? 'other').toLowerCase();
        if (!grouped[type]) grouped[type] = [];
        grouped[type].push(ticket);
      });

      const ticketsByType = Object.entries(grouped).map(([type, tickets]) => {
        const availableQuantity = tickets.reduce(
          (sum, t) =>
            sum + ((t.quantity ?? 0) - (t.reserved_quantity ?? 0) - (t.sold_quantity ?? 0)),
          0
        );

        return {
          ticket_type: type,
          total_available_quantity_type: Math.max(0, availableQuantity),
          tickets,
        };
      });

      /* ---------- Response ---------- */
      return res.status(200).json({
        status: true,
        data: {
          event_id: event.id ?? eventId,
          title: event.name ?? null,
          image: event.images?.[0]?.url ?? null,
          start_date: event.dates?.start?.localDate ?? null,
          end_date: event.dates?.end?.localDate ?? event.dates?.start?.localDate ?? null,
          time: event.dates?.start?.localTime ?? null,
          venue: venue?.name ?? null,
          location: venue?.city?.name ?? null,
          orginal_ticket_url: event.url ?? null,
          total_quantity: totalQuantity,
          total_reserved_quantity: totalReserved,
          total_sold_quantity: totalSold,
          total_available_quantity: totalAvailable,
          tickets_by_type: ticketsByType,
        },
      });
    } catch (error: any) {
      console.error('GetEventTickets Error:', error);
      return res.status(500).json({
        status: false,
        message: 'Failed to fetch event tickets',
      });
    }
  }

  public async getSimilarEvent(req: Request, res: any): Promise<any> {
    try {
      const eventId = req.params.eventId;
      console.log({ eventId });
      /* ---------- 1. Fetch event details ---------- */
      const eventResponse = await axios.get(
        `https://app.ticketmaster.com/discovery/v2/events/${eventId}.json`,
        {
          params: { apikey: config.ticketmaster.ticket_master_api_key },
        }
      );

      const event = eventResponse.data;
      if (!event) {
        return res.status(404).json({ status: false, message: 'Event not found' });
      }

      /* ---------- 2. Extract genre and location ---------- */
      const category = event.classifications?.[0]?.genre?.name ?? null;
      const venue = event._embedded?.venues?.[0];
      const lat = venue?.location?.latitude ?? null;
      const lng = venue?.location?.longitude ?? null;

      /* ---------- 3. Build search params ---------- */
      const params: Record<string, any> = {
        apikey: config.ticketmaster.ticket_master_api_key,
        size: 8,
        sort: 'date,asc',
      };

      if (category) params.classificationName = category;
      if (lat && lng) {
        params.latlong = `${lat},${lng}`;
        params.radius = 100;
        params.unit = 'km';
      }

      /* ---------- 4. Fetch similar events ---------- */
      const similarResponse = await axios.get(`${config.ticketmaster.ticket_master_events_url}`, {
        params,
      });

      const events = similarResponse.data?._embedded?.events ?? [];

      /* ---------- 5. Filter out current event ---------- */
      const filteredEvents = events.filter((e: any) => e.id !== eventId);

      /* ---------- 6. Fetch resale tickets in bulk ---------- */
      const eventIds = filteredEvents.map((e: any) => e.id);

      const resaleTickets = await this.prisma.resaleTicket.findMany({
        where: {
          event_id: { in: eventIds },
          status: 'approved',
        },
      });

      const ticketsByEvent: Record<string, typeof resaleTickets> = {};
      resaleTickets.forEach(ticket => {
        if (!ticket.event_id) return;
        if (!ticketsByEvent[ticket.event_id]) ticketsByEvent[ticket.event_id] = [];
        ticketsByEvent[ticket.event_id].push(ticket);
      });

      /* ---------- 7. Map events ---------- */
      const mappedEvents = filteredEvents.map((event: any) => {
        const tickets = ticketsByEvent[event.id] ?? [];

        const totalQuantity = tickets.reduce((sum, t) => sum + (t.quantity ?? 0), 0);
        const totalReserved = tickets.reduce((sum, t) => sum + (t.reserved_quantity ?? 0), 0);
        const totalSold = tickets.reduce((sum, t) => sum + (t.sold_quantity ?? 0), 0);
        const totalAvailable = Math.max(0, totalQuantity - totalReserved - totalSold);

        const venue = event._embedded?.venues?.[0];
        const eventLat = venue?.location?.latitude ?? null;
        const eventLng = venue?.location?.longitude ?? null;

        return {
          id: event.id,
          title: event.name,
          image: event.images?.[0]?.url ?? null,
          date: event.dates?.start?.localDate ?? null,
          venue: venue?.name ?? null,
          location: venue?.city?.name ?? null,
          latitude: eventLat,
          longitude: eventLng,
          available_quantity: totalAvailable,
          ticket_url: event.url ?? null,
        };
      });

      /* ---------- 8. Return response ---------- */
      return res.status(200).json({
        status: true,
        data: mappedEvents,
      });
    } catch (error: any) {
      console.error('GetSimilarEvent Error:', error);
      return res.status(500).json({
        status: false,
        message: 'Failed to fetch similar events',
      });
    }
  }

  public async getCitiesSearch(req: Request, res: any): Promise<any> {
    try {
      const query = req.query.query as string;

      if (!query || query.trim().length === 0) {
        return res.status(400).json({
          status: false,
          message: 'Query parameter is required',
        });
      }

      const response = await axios.get(`https://${process.env.GEODB_API_HOST}/v1/geo/cities`, {
        headers: {
          'X-RapidAPI-Key': process.env.GEODB_API_KEY!,
          'X-RapidAPI-Host': process.env.GEODB_API_HOST!,
        },
        params: {
          namePrefix: query,
          limit: 10,
          sort: '-population',
        },
      });

      const citiesData = response.data?.data ?? [];

      const cities = citiesData.map((city: any) => ({
        city: city.city,
        country: city.country,
        latitude: city.latitude,
        longitude: city.longitude,
      }));

      return res.status(200).json({
        status: true,
        cities,
      });
    } catch (error: any) {
      console.error('GetCitiesSearch Error:', error);
      return res.status(500).json({
        status: false,
        message: 'Failed to fetch cities',
      });
    }
  }

  public async getTicketsByType(req: Request, res: any): Promise<any> {
    try {
      const eventId = req.params.eventId;
      const ticketType = (req.params.ticketType ?? '').toLowerCase();

      if (!ticketType) {
        return res.status(400).json({
          status: false,
          message: 'Ticket type is required',
        });
      }

      /* ---------- 1. Fetch tickets ---------- */
      const tickets = await this.prisma.resaleTicket.findMany({
        where: {
          event_id: eventId,
          status: 'approved',
          ticket_type: {
            equals: ticketType,
            mode: 'insensitive', // case-insensitive match
          },
        },
        select: {
          id: true,
          event_id: true,
          user_id: true,
          ticket_type: true,
          price: true,
          seat_info: true,
          additional_info: true,
          quantity: true,
          reserved_quantity: true,
          sold_quantity: true,
          start_date: true,
          end_date: true,
          time: true,
          user: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
        },
      });

      /* ---------- 2. Handle empty result ---------- */
      if (!tickets.length) {
        return res.status(200).json({
          status: true,
          message: 'No tickets available for this type.',
          ticket_type: ticketType,
          tickets: [],
        });
      }

      /* ---------- 3. Calculate total available ---------- */
      const totalAvailable = tickets.reduce((sum, t) => {
        return sum + ((t.quantity ?? 0) - (t.reserved_quantity ?? 0) - (t.sold_quantity ?? 0));
      }, 0);

      /* ---------- 4. Return response ---------- */
      return res.status(200).json({
        status: true,
        event_id: eventId,
        ticket_type: ticketType,
        total_available_quantity_type: totalAvailable,
        tickets,
      });
    } catch (error: any) {
      console.error('GetTicketsByType Error:', error);
      return res.status(500).json({
        status: false,
        message: 'Failed to fetch tickets by type',
      });
    }
  }

  public async updateById(id: string, data: UpdateEventInput, include?: any) {
    return super.updateById(id, data, include);
  }

  public async deleteById(id: string) {
    return super.deleteById(id);
  }

  public async exists(filters: any) {
    return super.exists(filters);
  }
}
