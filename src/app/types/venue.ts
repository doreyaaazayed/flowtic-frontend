/** Venue record from GET /api/venues (enriched list). */
export type VenueAvailabilityStatus = "hosting" | "available";

export type VenueListItem = {
  _id: string;
  VenueID: number;
  Name: string;
  Location: string;
  Capacity?: number | null;
  Type?: string | null;
  Description?: string | null;
  imageUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
  activeEventCount?: number;
  availabilityStatus?: VenueAvailabilityStatus;
};

export type VenueListPage = {
  data: VenueListItem[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
};
