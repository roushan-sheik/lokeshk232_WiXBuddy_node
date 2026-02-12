import { BaseService } from "@/core/BaseService";
import { PrismaClient } from "@/generated/prisma/client";
import { PaginationOptions } from "@/types/types";
import { CreateTicketInput, UpdateTicketInput } from "./ticket.validation";
import axios from "axios";
import config from "@/core/config";

export class TicketService extends BaseService<
  any,
  CreateTicketInput,
  UpdateTicketInput
> {
  constructor(prisma: PrismaClient) {
    super(prisma, "ResaleTicket", {
      enableSoftDelete: true,
      enableAuditFields: true,
    });
  }

  protected getModel() {
    // @ts-ignore - The model 'resale_tickets' might not exist in PrismaClient types yet
    return this.prisma.resaleTicket;
  }

  // =========================================================================
  // Public API - Exposing BaseService methods
  // Since BaseService methods are protected, we must expose them here
  // =========================================================================

  public async create(data: CreateTicketInput, userId: any, include?: any) {
    // console.log({ userId });
    // console.log({ data });
    const profileData = {
      country_of_residence: data.country_of_residence,
      address: data.address,
      city: data.city,
      postal_code: data.postal_code,
      bank_country: data.bank_country,
      account_holder_name: data.account_holder_name,
      phone_number: data.phone_number,
      bank_account_number: data.bank_account_number,
    };

    const financialProfile = await this.prisma.financialProfile.upsert({
      where: { user_id: userId },
      update: profileData,
      create: { user_id: userId, ...profileData },
    });
    // // 2️⃣ Fetch Ticketmaster event details
    let eventDetails = {
      title: "Unknown Event",
      venue: null,
      category: null,
      artist: null,
    };

    if (data.ticketmaster_id) {
      try {
        const response = await axios.get(
          `https://app.ticketmaster.com/discovery/v2/events/${data.ticketmaster_id}`,
          { params: { apikey: config.ticketmaster.ticket_master_api_key } },
        );
        const event = response.data;

        eventDetails.title = event.name ?? "Unknown Event";
        eventDetails.venue = event._embedded?.venues?.[0]?.name ?? null;
        eventDetails.category =
          event.classifications?.[0]?.segment?.name ?? null;
        eventDetails.artist = event._embedded?.attractions?.[0]?.name ?? null;
      } catch (err) {
        console.warn("Ticketmaster fetch failed, using defaults");
      }
    }

    // 3️⃣ Prepare ticket data
    const ticketData: any = {
      user_id: userId,
      financial_profile_id: financialProfile.id,

      event_id: data.ticketmaster_id,
      ticketmaster_id: data.ticketmaster_id,

      title: eventDetails.title,
      venue: eventDetails.venue ?? "",

      artist: eventDetails.artist ?? undefined,
      category: eventDetails.category ?? undefined,

      quantity: data.quantity ?? 1,
      original_price: data.original_price,
      price: data.price,

      start_date: data.start_date ? new Date(data.start_date) : undefined,
      end_date: data.end_date ? new Date(data.end_date) : undefined,

      time: data.time ? new Date(`1970-01-01T${data.time}Z`) : undefined,

      ticket_type: data.ticket_type ?? "Regular",
      additional_info: data.additional_info ?? undefined,
    };

    // // 4️⃣ Call BaseService.create
    return super.create(ticketData, include);
  }

  public async findMany(
    filters: any = {},
    pagination?: Partial<PaginationOptions>,
    orderBy?: any,
    include?: any,
  ) {
    return super.findMany(filters, pagination, orderBy, include);
  }

  public async findById(id: string, include?: any) {
    return super.findById(id, include);
  }

  public async updateById(id: string, data: UpdateTicketInput, include?: any) {
    return super.updateById(id, data, include);
  }

  public async deleteById(id: string) {
    return super.deleteById(id);
  }

  public async exists(filters: any) {
    return super.exists(filters);
  }
}
