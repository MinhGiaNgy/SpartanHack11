type GeocodeResult = {
  latitude: number;
  longitude: number;
};

type HasLatLng = {
  latitude?: number | null;
  longitude?: number | null;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const geocodeNominatim = async (query: string): Promise<GeocodeResult | null> => {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "json");
  url.searchParams.set("q", query);
  url.searchParams.set("limit", "1");

  const email = process.env.GEOCODING_EMAIL;
  if (email) {
    url.searchParams.set("email", email);
  }

  const userAgent =
    process.env.GEOCODING_USER_AGENT ??
    (email ? `SpartaSafe/0.1 (${email})` : "SpartaSafe/0.1");

  const response = await fetch(url, {
    headers: {
      "User-Agent": userAgent,
      "Accept-Language": "en",
    },
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as Array<{ lat: string; lon: string }>;
  if (!data?.length) return null;

  const latitude = Number.parseFloat(data[0].lat);
  const longitude = Number.parseFloat(data[0].lon);

  if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
    return null;
  }

  return { latitude, longitude };
};

const sanitizeAddress = (value: string) => {
  let cleaned = value;
  cleaned = cleaned.replace(/\b(Bldg\.?|Building|Hall)\b/gi, "");
  cleaned = cleaned.replace(/\b(Apt|Apartment|Suite|Ste|Unit|#)\s*\w+/gi, "");
  cleaned = cleaned.replace(/\b(BLOCK)\b/gi, "");
  cleaned = cleaned.replace(/\d+\s*-\s*\d+/g, "");
  cleaned = cleaned.replace(/\s{2,}/g, " ").trim();
  return cleaned;
};

const buildFallbackQueries = (
  locationName: string | null | undefined,
  address: string | null | undefined,
  cityContext: string
) => {
  const queries: string[] = [];

  const loc = locationName?.trim() ?? "";
  const addr = address?.trim() ?? "";
  const addrClean = addr ? sanitizeAddress(addr) : "";
  const locClean = loc ? sanitizeAddress(loc) : "";

  if (loc && addr) {
    queries.push(`${loc}, ${addr}, ${cityContext}`);
  }
  if (loc) {
    queries.push(`${loc}, ${cityContext}`);
  }
  if (addr) {
    queries.push(`${addr}, ${cityContext}`);
  }
  if (addrClean && addrClean !== addr) {
    queries.push(`${addrClean}, ${cityContext}`);
  }
  if (locClean && locClean !== loc) {
    queries.push(`${locClean}, ${cityContext}`);
  }

  return Array.from(new Set(queries.filter(Boolean)));
};

export const applyGeocoding = async <T extends HasLatLng>(
  items: T[],
  getQuery: (item: T) => string | null,
  options?: { max?: number; delayMs?: number; fallback?: (item: T) => string[] }
): Promise<T[]> => {
  const max = Math.max(options?.max ?? 25, 0);
  const delayMs = Math.max(options?.delayMs ?? 1100, 0);

  if (max === 0) return items;

  const cache = new Map<string, GeocodeResult | null>();
  let processed = 0;

  for (const item of items) {
    if (processed >= max) break;
    if (item.latitude != null && item.longitude != null) continue;

    const baseQuery = getQuery(item);
    const fallbackQueries = options?.fallback?.(item) ?? [];
    const queries = Array.from(
      new Set([baseQuery, ...fallbackQueries].filter(Boolean))
    ) as string[];

    if (!queries.length) continue;

    let result: GeocodeResult | null = null;
    for (const query of queries) {
      if (cache.has(query)) {
        result = cache.get(query) ?? null;
      } else {
        result = await geocodeNominatim(query);
        cache.set(query, result);
      }

      if (result) break;
    }

    if (result) {
      item.latitude = result.latitude;
      item.longitude = result.longitude;
    }

    processed += 1;
    if (delayMs > 0) {
      await sleep(delayMs);
    }
  }

  return items;
};

export { buildFallbackQueries };
