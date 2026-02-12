import { BaseService } from "@/core/BaseService";
import { PrismaClient } from "@/generated/prisma/client";
import { PaginationOptions } from "@/types/types";
import {
  CreateFavoriteInput,
  UpdateFavoriteInput,
} from "./favorite.validation";
import axios from "axios";

export class FavoriteService extends BaseService<
  any,
  CreateFavoriteInput,
  UpdateFavoriteInput
> {
  constructor(prisma: PrismaClient) {
    super(prisma, "Favorite", {
      enableSoftDelete: true,
      enableAuditFields: true,
    });
  }

  protected getModel() {
    // @ts-ignore - The model 'favorite' might not exist in PrismaClient types yet
    return this.prisma.favorite;
  }

  // =========================================================================
  // Public API - Exposing BaseService methods
  // Since BaseService methods are protected, we must expose them here
  // =========================================================================

  public async createFavorite(
    data: CreateFavoriteInput,
    eventId: string | undefined,
    userId: string | undefined,
    include?: any,
  ) {
    return super.create(
      { status: data.status, event_id: eventId, user_id: userId },
      include,
    );
  }

  public async myFavorites(userId: number) {
    // 1. Get favorites from DB
    const favorites = await this.prisma.favorite.findMany({
      where: {
        userId,
      },
    });

    if (!favorites.length) {
      return {
        status: true,
        data: [],
      };
    }

    // 2. Collect event IDs
    const eventIds = favorites.map((f) => f.eventId);

    try {
      // 3. Call Ticketmaster API
      const response = await axios.get(
        "https://app.ticketmaster.com/discovery/v2/events.json",
        {
          params: {
            apikey: process.env.TICKETMASTER_API_KEY,
            id: eventIds.join(","), // multiple id support
          },
        },
      );

      const events = response.data?._embedded?.events || [];

      // 4. Format like Laravel
      const result = events.map((event: any) => {
        const fav = favorites.find((f) => f.eventId === event.id);

        return {
          id: event.id,
          title: event.name,

          venue: event._embedded?.venues?.[0]?.name ?? null,
          location: event._embedded?.venues?.[0]?.city?.name ?? null,

          start_date: event.dates?.start?.localDate ?? null,
          end_date:
            event.dates?.end?.localDate ??
            event.dates?.start?.localDate ??
            null,

          time: event.dates?.start?.localTime ?? null,

          category: event.classifications?.[0]?.segment?.name ?? null,

          status: fav?.status,

          image: event.images?.[0]?.url ?? null,
        };
      });

      return {
        status: true,
        data: result,
      };
    } catch (error) {
      return {
        status: false,
        message: "Failed to fetch events from Ticketmaster",
      };
    }
  }

  public async findById(id: string, include?: any) {
    return super.findById(id, include);
  }

  public async updateById(
    id: string,
    data: UpdateFavoriteInput,
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
