import { applyGeocoding } from "../../../../lib/geocode";
import { prisma } from "../../../../lib/prisma";

export const runtime = "nodejs";

const authorize = (request: Request) => {
  const secret = process.env.GEOCODING_SECRET;
  if (!secret) return true;

  const header = request.headers.get("x-crime-secret");
  const url = new URL(request.url);
  const query = url.searchParams.get("secret");

  return header === secret || query === secret;
};

export async function POST(request: Request) {
  if (!authorize(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? "25"), 100);
  const source = url.searchParams.get("source");
  const randomize = url.searchParams.get("random") === "true";
  const delayMs = Number(
    url.searchParams.get("geocodeDelay") ??
      process.env.GEOCODING_DELAY_MS ??
      "1100"
  );

  const where: Record<string, unknown> = {
    OR: [{ latitude: null }, { longitude: null }],
  };
  if (source) {
    where.source = source;
  }

  const incidents = await prisma.crimeIncident.findMany({
    where,
    orderBy: { occurredAt: "desc" },
    take: limit,
  });

  const geocoded = randomize
    ? incidents.map((incident) => {
        const latitude = 42.70 + Math.random() * 0.07;
        const longitude = -84.50 + Math.random() * 0.06;
        return { ...incident, latitude, longitude };
      })
    : await applyGeocoding(
        incidents,
        (incident) => {
          const parts = [
            incident.locationName,
            incident.address,
            incident.location,
            "East Lansing, MI",
          ].filter(Boolean);
          if (!parts.length) return null;
          return parts.join(", ");
        },
        { max: limit, delayMs }
      );

  const updates = geocoded
    .filter((incident) => incident.latitude != null && incident.longitude != null)
    .map((incident) =>
      prisma.crimeIncident.update({
        where: { id: incident.id },
        data: {
          latitude: incident.latitude,
          longitude: incident.longitude,
        },
      })
    );

  if (updates.length) {
    await prisma.$transaction(updates);
  }

  return Response.json({
    checked: incidents.length,
    geocoded: updates.length,
  });
}
