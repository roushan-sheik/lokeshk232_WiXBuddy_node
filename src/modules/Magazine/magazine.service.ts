import { BaseService } from "@/core/BaseService";
import { PrismaClient } from "@/generated/prisma/client";
import { PaginationOptions } from "@/types/types";
import {
  CreateMagazineInput,
  UpdateMagazineInput,
} from "./magazine.validation";
import axios from "axios";
import config from "@/core/config";
import { truncateWords } from "@/utils/truncateWords";
import { stripTags } from "@/utils/stripTags";

export class MagazineService extends BaseService<
  any,
  CreateMagazineInput,
  UpdateMagazineInput
> {
  constructor(prisma: PrismaClient) {
    super(prisma, "Magazine", {
      enableSoftDelete: true,
      enableAuditFields: true,
    });
  }

  protected getModel() {
    // @ts-ignore - The model 'magazine' might not exist in PrismaClient types yet
    return this.prisma.magazine;
  }

  // =========================================================================
  // Public API - Exposing BaseService methods
  // Since BaseService methods are protected, we must expose them here
  // =========================================================================

  public async create(data: CreateMagazineInput, include?: any) {
    return super.create(data, include);
  }

  public async getEvents(
    filters: any = {},
    pagination?: Partial<PaginationOptions>,
    orderBy?: any,
    include?: any,
  ) {
    try {
      const size = pagination?.limit || 20;

      const response = await axios.get(
        "https://app.ticketmaster.com/discovery/v2/events.json",
        {
          params: {
            apikey: config.ticketmaster.ticket_master_api_key,
            size,
            sort: "date,asc",
          },
        },
      );
      const events = response.data?._embedded?.events ?? [];
      console.log({ events }, response.data);

      const formatted = events.map((event: any) => {
        const desc = event.info || event.pleaseNote || "";

        return {
          image: event.images?.[0]?.url ?? null,
          id: event.id ?? null,
          title: event.name ?? null,

          tags: (event.classifications || [])
            .map((c: any) => c?.genre?.name)
            .filter(Boolean),

          short_description: truncateWords(stripTags(desc), 10),

          start_date: event.dates?.start?.localDate ?? null,
        };
      });

      return {
        status: true,
        data: formatted,
      };
    } catch (error) {
      console.error("findMany events error:", error);

      return {
        status: false,
        message: "Failed to fetch events",
        data: [],
      };
    }
  }

  public async getEventDetails(id: string, include?: any) {
    try {
      const response = await axios.get(
        `https://app.ticketmaster.com/discovery/v2/events/${id}.json`,
        {
          params: {
            apikey: process.env.TICKETMASTER_API_KEY,
          },
        },
      );

      const event = response.data;

      const formatted = {
        id: event.id ?? null,
        title: event.name ?? null,

        images: (event.images || [])
          .map((img: any) => img?.url)
          .filter(Boolean),

        start_date: event.dates?.start?.localDate ?? null,
        start_time: event.dates?.start?.localTime ?? null,

        tags: (event.classifications || [])
          .map((c: any) => c?.genre?.name)
          .filter(Boolean),

        description: event.info || event.pleaseNote || null,

        venue: event._embedded?.venues?.[0]?.name ?? null,
        location: event._embedded?.venues?.[0]?.city?.name ?? null,
        country: event._embedded?.venues?.[0]?.country?.name ?? null,

        attractions: (event._embedded?.attractions || [])
          .map((a: any) => a?.name)
          .filter(Boolean),

        ticket_url: event.url ?? null,
      };

      return {
        status: true,
        data: formatted,
      };
    } catch (error) {
      return {
        status: false,
        message: "Event not found",
      };
    }
  }
  public async getEventsByTag(tag: string) {
    try {
      const response = await axios.get(
        "https://app.ticketmaster.com/discovery/v2/events.json",
        {
          params: {
            classificationName: tag,
            apikey: process.env.TICKETMASTER_API_KEY,
            size: 10,
          },
        },
      );

      const events = response.data?._embedded?.events ?? [];

      const formatted = events.map((event: any) => {
        const desc = event.info || event.pleaseNote || "";

        return {
          id: event.id,
          title: event.name,

          image: event.images?.[0]?.url ?? null,

          short_description:
            desc.length > 100 ? desc.substring(0, 100) + "..." : desc,

          start_date: event.dates?.start?.localDate ?? null,

          tags: (event.classifications || [])
            .map((c: any) => c?.genre?.name)
            .filter(Boolean),
        };
      });

      return {
        status: true,
        data: formatted,
      };
    } catch (error) {
      return {
        status: false,
        message: "Failed to fetch events for this tag",
      };
    }
  }
  public async updateById(
    id: string,
    data: UpdateMagazineInput,
    include?: any,
  ) {
    return super.updateById(id, data, include);
  }

  public async deleteById(id: string) {
    return super.deleteById(id);
  }

  public async exists(filters: any) {
    return super.exists(filters);
  }
}
