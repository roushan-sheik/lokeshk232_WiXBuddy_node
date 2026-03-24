/* ---------- Pagination ---------- */
export interface PaginationOptions {
  page: number;
  size: number;
}

/* ---------- Query Params ---------- */
export interface FindManyQuery {
  period?: 'today' | 'tomorrow' | 'this-week' | 'next-week' | 'this-month' | 'custom';
  location?: string;
  category?: string;
  venue?: string;
  from?: string;
  to?: string;
  query?: string;
  filter?: 'city' | 'genre';
  page?: number;
  size?: number;
  lat?: number;
  lng?: number;
  radius?: number;
  genre?: string | string[];
}

/* ---------- Ticketmaster Event ---------- */
export interface TicketmasterEvent {
  id: string;
  name: string;
  url?: string;
  info?: string;
  pleaseNote?: string;

  images?: { url: string }[];

  dates?: {
    start?: {
      localDate?: string;
      localTime?: string;
    };
    end?: {
      localDate?: string;
    };
  };

  classifications?: {
    genre?: { name?: string };
    segment?: { name?: string };
  }[];

  _embedded?: {
    venues?: {
      name?: string;
      city?: { name?: string };
      location?: {
        latitude?: string;
        longitude?: string;
      };
    }[];
  };
}

/* ---------- Response ---------- */
export interface FindManyResponse {
  status: boolean;
  message?: string;
  pagination?: any;
  data?: any[];
}
