const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

export function buildGoogleMapsEmbedUrl(query: string): string {
  const encoded = encodeURIComponent(query.trim());
  if (GOOGLE_MAPS_API_KEY) {
    return `https://www.google.com/maps/embed/v1/place?key=${GOOGLE_MAPS_API_KEY}&q=${encoded}`;
  }
  return `https://maps.google.com/maps?q=${encoded}&hl=en&z=15&output=embed`;
}

/** Opens Google Maps with destination prefilled for directions. */
export function buildGoogleMapsDirectionsUrl(query: string): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query.trim())}`;
}
