import { fetchClery, normalizeClery } from "../../../../lib/clery";
import { applyGeocoding } from "../../../../lib/geocode";
import { prisma } from "../../../../lib/prisma";

export const runtime = "nodejs";

const authorize = (request: Request) => {
  const secret = process.env.CLERY_INGEST_SECRET;
  if (!secret) return true;

  const header = request.headers.get("x-crime-secret");
  const url = new URL(request.url);
  const query = url.searchParams.get("secret");

  return header === secret || query === secret;
};

const ingest = async (request: Request) => {
  if (!authorize(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const start = Number(url.searchParams.get("start") ?? "0");
  const length = Math.min(Number(url.searchParams.get("length") ?? "250"), 1000);

  const payload = await fetchClery({ start, length });
  const normalized = normalizeClery(payload.data);

  const geocodeParam = url.searchParams.get("geocode");
  const shouldGeocode = geocodeParam !== "false";
  const geocodeMax = Number(
    url.searchParams.get("geocodeMax") ??
      process.env.GEOCODING_MAX_PER_RUN ??
      "25"
  );
  const geocodeDelay = Number(
    url.searchParams.get("geocodeDelay") ??
      process.env.GEOCODING_DELAY_MS ??
      "1100"
  );

  const toUpsert = shouldGeocode
    ? await applyGeocoding(
        normalized,
        (incident) => {
          const pieces = [
            incident.locationName,
            incident.address,
            "Michigan State University",
            "East Lansing, MI",
          ].filter(Boolean);
          if (!pieces.length) return null;
          return pieces.join(", ");
        },
        {
          max: geocodeMax,
          delayMs: geocodeDelay,
        }
      )
    : normalized;

  const geocodedCount = toUpsert.filter(
    (incident) => incident.latitude != null && incident.longitude != null
  ).length;

  const batchSize = Math.max(
    Number(process.env.INGEST_BATCH_SIZE ?? "25"),
    1
  );
  let upsertedCount = 0;

  for (let i = 0; i < toUpsert.length; i += batchSize) {
    const batch = toUpsert.slice(i, i + batchSize);
    await Promise.all(
      batch.map((incident) =>
        prisma.crimeIncident.upsert({
          where: { sourceIncidentId: incident.sourceIncidentId },
          update: {
            incidentNum: incident.incidentNum,
            caseNumber: incident.caseNumber,
            offenseCode: incident.offenseCode,
            description: incident.description,
            location: incident.location,
            locationName: incident.locationName,
            address: incident.address,
            crossStreet: incident.crossStreet,
            latitude: incident.latitude,
            longitude: incident.longitude,
            agency: incident.agency,
            occurredAt: incident.occurredAt,
            reportedAt: incident.reportedAt,
            disposition: incident.disposition,
            raw: incident.raw,
          },
          create: {
            source: incident.source,
            sourceIncidentId: incident.sourceIncidentId,
            incidentNum: incident.incidentNum,
            caseNumber: incident.caseNumber,
            offenseCode: incident.offenseCode,
            description: incident.description,
            location: incident.location,
            locationName: incident.locationName,
            address: incident.address,
            crossStreet: incident.crossStreet,
            latitude: incident.latitude,
            longitude: incident.longitude,
            agency: incident.agency,
            occurredAt: incident.occurredAt,
            reportedAt: incident.reportedAt,
            disposition: incident.disposition,
            raw: incident.raw,
          },
        })
      )
    );
    upsertedCount += batch.length;
  }

  return Response.json({
    total: payload.recordsTotal,
    ingested: upsertedCount,
    geocoded: shouldGeocode ? geocodedCount : 0,
  });
};

export async function GET(request: Request) {
  return ingest(request);
}

export async function POST(request: Request) {
  return ingest(request);
}
