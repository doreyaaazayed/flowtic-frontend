import type { VenueListItem } from "../types/venue";
import { resolveVenueImageSrc } from "./venueImage";

const TYPE_IMAGES: Record<string, string> = {
  stadium:
    "https://images.unsplash.com/photo-1522778119026-d78848d34590?w=800&q=80",
  arena:
    "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&q=80",
  theater:
    "https://images.unsplash.com/photo-1503099777049-73197b0ef518?w=800&q=80",
  conference:
    "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80",
  campus:
    "https://images.unsplash.com/photo-1562774053-701939374585?w=800&q=80",
  "cultural center":
    "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=80",
  "open air":
    "https://images.unsplash.com/photo-1459747759030-7d966e397008?w=800&q=80",
};

const DEFAULT_VENUE_IMAGE =
  "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=80";

export function venueImageUrl(venue: VenueListItem): string {
  const resolved = resolveVenueImageSrc(venue.imageUrl);
  if (resolved) return resolved;
  const typeKey = (venue.Type || "").toLowerCase();
  const match = Object.keys(TYPE_IMAGES).find((k) => typeKey.includes(k));
  return TYPE_IMAGES[match ?? ""] || DEFAULT_VENUE_IMAGE;
}

export function venueDescriptionPreview(venue: VenueListItem, maxLen = 120): string {
  const raw = venue.Description?.trim() || venue.Type?.trim() || "";
  if (!raw) return "";
  if (raw.length <= maxLen) return raw;
  return `${raw.slice(0, maxLen).trim()}…`;
}

export function formatVenueCapacity(capacity?: number | null): string | null {
  if (capacity == null || Number.isNaN(capacity)) return null;
  return capacity.toLocaleString();
}

export function formatVenueDate(iso?: string, locale = "en"): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
